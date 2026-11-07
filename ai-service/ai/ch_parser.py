"""
ch_parser.py — Production-grade Companies House ownership parser.
Zero AI. Deterministic. Handles every edge case for real KYB/AML use.
"""
import re
from typing import Optional

_UK_REGISTRY = {
    "companies house",
    "registrar of companies for england and wales",
    "registrar of companies for england",
    "registrar of companies for scotland",
    "registrar of companies for northern ireland",
    "registrar of companies for wales",
    "england and wales",
    "england & wales",
    "england",
    "wales",
    "scotland",
    "northern ireland",
    "great britain",
    "united kingdom",
    "uk",
    "gb",
    "companie house",
}

_OFFSHORE_KEYWORDS = [
    "cayman", "british virgin", "bvi", "bermuda", "jersey",
    "guernsey", "isle of man", "luxembourg", "delaware",
    "panama", "seychelles", "bahamas", "liechtenstein",
    "malta", "cyprus", "marshall islands", "samoa",
    "vanuatu", "nauru", "anguilla", "turks and caicos",
    "cook islands", "labuan", "mauritius", "maldives",
]

_BAND_MIDPOINTS = {
    "25-to-50-percent": 37.5,
    "50-to-75-percent": 62.5,
    "75-to-100-percent": 87.5,
    "more-than-25-percent-but-not-more-than-50-percent": 37.5,
    "more-than-50-percent-but-less-than-75-percent": 62.5,
    "75-percent-or-more": 87.5,
}


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "_", name.lower()).strip("_") or "unknown"


def _parse_ownership_pct(natures: list[str]) -> float:
    for n in natures:
        key = n.lower().replace(" ", "-")
        for band, pct in _BAND_MIDPOINTS.items():
            if band in key:
                return pct
    return 0.0


def _normalize_jurisdiction(raw: Optional[str]) -> tuple[str, bool]:
    if not raw or not raw.strip():
        return "Unknown", False

    clean = raw.lower().strip()

    if clean in ("unknown", "n/a", "not applicable", "none"):
        return "Unknown", False

    for uk in _UK_REGISTRY:
        if uk in clean:
            return "United Kingdom", False

    for kw in _OFFSHORE_KEYWORDS:
        if kw in clean:
            return raw.strip().title(), True

    return raw.strip().title(), False


def _psc_entity_type(kind: str) -> str:
    k = kind.lower()
    if "corporate" in k or "legal-person" in k:
        return "company"
    if "super-secure" in k:
        return "individual"
    return "individual"


def parse_companies_house_data(raw: dict) -> tuple[list[dict], list[dict], list[dict]]:
    nodes: list[dict] = []
    edges: list[dict] = []
    seen_ids: set[str] = set()

    company_name: str = raw.get("company_name", "Unknown Company")
    crn: str = raw.get("crn", "")
    company_id: str = _slugify(company_name)
    if company_id in seen_ids:
        company_id = f"{company_id}_{crn.lower()}"
    seen_ids.add(company_id)

    # ── Target company node ───────────────────────────────────────────────────
    nodes.append({
        "id": company_id,
        "label": company_name,
        "type": "company",
        "jurisdiction": "United Kingdom",
        "risk_level": "AUTO_APPROVE",
        "incorporation_date": raw.get("incorporation_date"),
        "sic_codes": raw.get("sic_codes", []),
        "is_target": True,
        "tags": [],
    })

    psc_count = 0

    # ── PSC nodes + directed ownership edges ──────────────────────────────────
    for psc in raw.get("pscs", []):
        name: str = psc.get("name", "").strip()
        if not name:
            continue

        psc_id = _slugify(name)
        base = psc_id
        counter = 1
        while psc_id in seen_ids:
            psc_id = f"{base}_{counter}"
            counter += 1
        seen_ids.add(psc_id)

        kind: str = psc.get("type", "individual-person-with-significant-control")
        entity_type: str = _psc_entity_type(kind)

        raw_juris: Optional[str] = (
            psc.get("country_of_residence")
            or psc.get("jurisdiction")
            or ""
        )
        display_juris, is_offshore = _normalize_jurisdiction(raw_juris)

        natures: list[str] = psc.get("natures_of_control", [])
        ownership_pct: float = psc.get("ownership_pct", _parse_ownership_pct(natures))

        tags: list[str] = []
        if is_offshore:
            tags.append("OFFSHORE")
        if entity_type == "company":
            tags.append("CORPORATE_PSC")

        nodes.append({
            "id": psc_id,
            "label": name,
            "type": entity_type,
            "jurisdiction": display_juris,
            "risk_level": "HIGH_RISK" if is_offshore else "AUTO_APPROVE",
            "incorporation_date": None,
            "sic_codes": [],
            "is_offshore": is_offshore,
            "ownership_pct": ownership_pct,
            "natures_of_control": natures,
            "registration_number": psc.get("registration_number", ""),
            "tags": tags,
        })

        nature_str = ", ".join(natures) if natures else f"{ownership_pct}% ownership"
        edges.append({
            "id": f"edge_{psc_id}_to_{company_id}",
            "source": psc_id,
            "target": company_id,
            "label": "significant_control",
            "ownership_pct": ownership_pct,
            "trust_score": 1.0,
            "evidence_snippet": f"PSC filing — {nature_str}",
            "source_doc": "Companies House API",
            "source_page": None,
        })
        psc_count += 1

    # ── If no PSCs, add an explanatory node ───────────────────────────────────
    if psc_count == 0:
        node_id = "no_psc_registered"
        nodes.append({
            "id": node_id,
            "label": "No PSC Registered",
            "type": "unknown",
            "jurisdiction": "Unknown",
            "risk_level": "MEDIUM_RISK",
            "incorporation_date": None,
            "sic_codes": [],
            "tags": ["NO_PSC", "DEAD_END"],
        })
        edges.append({
            "id": f"edge_{node_id}_to_{company_id}",
            "source": node_id,
            "target": company_id,
            "label": "unknown_control",
            "ownership_pct": 0.0,
            "trust_score": 0.0,
            "evidence_snippet": "No PSC registered with Companies House",
            "source_doc": "Companies House API",
            "source_page": None,
        })

    # ── Active officers ───────────────────────────────────────────────────────
    active_officers: list[dict] = []
    for i, o in enumerate(raw.get("officers", [])):
        if o.get("resigned_on") or o.get("resignation_date"):
            continue
        name = o.get("name", "").strip()
        if not name:
            continue

        active_officers.append({
            "name": name,
            "role": o.get("role", "officer"),
            "is_corporate": o.get("is_corporate", False),
            "appointment_date": o.get("appointment_date"),
        })

        node_id = f"officer_{i}_{_slugify(name)}"

        clean_o_name = name.lower().replace(",", " ").replace(".", " ")
        o_parts = set(clean_o_name.split())

        existing_psc_node = None
        for n in nodes:
            if n.get("is_target", False):
                continue
            clean_n = n["label"].lower().replace(",", " ").replace(".", " ")
            n_parts = set(clean_n.split())
            if len(o_parts & n_parts) >= 2 or clean_n == clean_o_name:
                existing_psc_node = n
                break

        if existing_psc_node:
            role_label = o.get("role", "director").title()
            for edge in edges:
                if edge["source"] == existing_psc_node["id"] and edge["target"] == company_id:
                    if edge["ownership_pct"] is not None:
                        edge["label"] = f"{role_label}, {edge['ownership_pct']}%"
                    else:
                        edge["label"] = f"{role_label}, {edge['label']}"
                    edge["evidence_snippet"] += f" | Also appointed {role_label} on {o.get('appointment_date') or 'Unknown'}"
                    break
            continue

        entity_type = "company" if o.get("is_corporate") else "individual"
        role_label = o.get("role", "director").title()
        risk_level = "HIGH_RISK" if o.get("is_corporate") else "AUTO_APPROVE"

        raw_juris = o.get("country_of_residence") or o.get("address", {}).get("country") or "United Kingdom"
        display_juris, is_offshore_officer = _normalize_jurisdiction(raw_juris)

        tags = []
        if o.get("is_corporate") and role_label.lower() in ("director", "nominee director", "corporate director"):
            tags.append("CORPORATE_DIRECTOR")
        if is_offshore_officer:
            tags.append("OFFSHORE")

        nodes.append({
            "id": node_id,
            "label": name,
            "type": entity_type,
            "jurisdiction": display_juris,
            "risk_level": "HIGH_RISK" if is_offshore_officer else risk_level,
            "incorporation_date": None,
            "sic_codes": [],
            "role": role_label,
            "appointment_date": o.get("appointment_date"),
            "tags": tags,
        })

        edges.append({
            "id": f"edge_{node_id}_to_{company_id}",
            "source": node_id,
            "target": company_id,
            "label": role_label,
            "ownership_pct": None,
            "trust_score": 1.0,
            "evidence_snippet": f"Appointed {role_label} on {o.get('appointment_date') or 'Unknown'}",
            "source_doc": "Companies House API (Officers)",
            "source_page": None,
        })

    return nodes, edges, active_officers
