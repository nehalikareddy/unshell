"""
fetch_ch.py — Complete Companies House data fetcher.
Pulls EVERY relevant endpoint and structures the data for maximum KYC signal.
"""
import os
import re
import base64
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv()

CH_BASE = "https://api.company-information.service.gov.uk"

OWNERSHIP_BAND_MIDPOINTS = {
    "25-to-50-percent": 37.5,
    "50-to-75-percent": 62.5,
    "75-to-100-percent": 87.5,
    "more-than-25-percent-but-not-more-than-50-percent": 37.5,
    "more-than-50-percent-but-less-than-75-percent": 62.5,
    "75-percent-or-more": 87.5,
}

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

# Built-in fallback profiles for demo CRNs when COMPANIES_HOUSE_API_KEY is not configured
DEMO_FALLBACK_COMPANIES = {
    "09446231": {
        "company_name": "MONZO BANK LIMITED",
        "crn": "09446231",
        "company_type": "ltd",
        "company_status": "active",
        "incorporation_date": "2015-02-18",
        "sic_codes": ["64191"],
        "registered_address": "Broadwalk House, 5 Appold Street, London, EC2A 2AG, United Kingdom",
        "pscs": [
            {
                "name": "Monzo Holding Limited",
                "type": "corporate-entity-person-with-significant-control",
                "ownership_pct": 87.5,
                "ownership_band": "ownership-of-shares-75-to-100-percent",
                "natures_of_control": ["ownership-of-shares-75-to-100-percent", "voting-rights-75-to-100-percent"],
                "natures_clean": ["75%–100% share ownership", "75%–100% voting rights"],
                "jurisdiction": "United Kingdom",
                "is_offshore": False,
                "registration_number": "",
                "notified_on": "2016-04-06",
            }
        ],
        "has_no_psc": False,
        "officers": [
            {
                "name": "ANIL, TS",
                "role": "director",
                "appointment_date": "2020-06-01",
                "resignation_date": None,
                "is_corporate": False,
                "nationality": "American",
                "country_of_residence": "United Kingdom",
            }
        ],
        "resigned_officer_count": 2,
        "filing_count": 120,
        "cs01_count": 8,
        "aa_count": 8,
        "recent_docs": [],
        "charges": [],
        "has_charges": False,
        "charge_count": 0,
        "last_accounts_date": "2024-03-31",
        "accounts_overdue": False,
        "is_dormant": False,
        "has_insolvency": False,
        "company_status_flag": False,
        "filing_history_raw": [],
    },
    "01683457": {
        "company_name": "INTERNATIONAL BUSINESS SYSTEMS LIMITED",
        "crn": "01683457",
        "company_type": "ltd",
        "company_status": "active",
        "incorporation_date": "1982-12-03",
        "sic_codes": ["62020"],
        "registered_address": "100 New Bridge Street, London, EC4V 6JA, United Kingdom",
        "pscs": [
            {
                "name": "FAIRFAX, Ian Gordon",
                "type": "individual-person-with-significant-control",
                "ownership_pct": 62.5,
                "ownership_band": "ownership-of-shares-50-to-75-percent",
                "natures_of_control": ["ownership-of-shares-50-to-75-percent"],
                "natures_clean": ["50%–75% share ownership"],
                "jurisdiction": "United Kingdom",
                "is_offshore": False,
                "registration_number": "",
                "notified_on": "2016-06-30",
            }
        ],
        "has_no_psc": False,
        "officers": [
            {
                "name": "FAIRFAX, Ian Gordon",
                "role": "director",
                "appointment_date": "1995-04-12",
                "resignation_date": None,
                "is_corporate": False,
                "nationality": "British",
                "country_of_residence": "United Kingdom",
            }
        ],
        "resigned_officer_count": 1,
        "filing_count": 64,
        "cs01_count": 7,
        "aa_count": 10,
        "recent_docs": [],
        "charges": [],
        "has_charges": False,
        "charge_count": 0,
        "last_accounts_date": "2023-12-31",
        "accounts_overdue": False,
        "is_dormant": False,
        "has_insolvency": False,
        "company_status_flag": False,
        "filing_history_raw": [],
    },
    "06026625": {
        "company_name": "SEABON LIMITED",
        "crn": "06026625",
        "company_type": "ltd",
        "company_status": "active",
        "incorporation_date": "2006-12-12",
        "sic_codes": ["74990"],
        "registered_address": "Suite 4, 219 Kensington High Street, London, W8 6BD, United Kingdom",
        "pscs": [],
        "has_no_psc": True,
        "officers": [
            {
                "name": "PREMIER DIRECTORS LIMITED",
                "role": "director",
                "appointment_date": "2006-12-12",
                "resignation_date": None,
                "is_corporate": True,
                "nationality": "",
                "country_of_residence": "British Virgin Islands",
            }
        ],
        "resigned_officer_count": 6,
        "filing_count": 4,
        "cs01_count": 1,
        "aa_count": 1,
        "recent_docs": [],
        "charges": [],
        "has_charges": False,
        "charge_count": 0,
        "last_accounts_date": "2021-12-31",
        "accounts_overdue": True,
        "is_dormant": True,
        "has_insolvency": False,
        "company_status_flag": False,
        "filing_history_raw": [],
    },
    "12871051": {
        "company_name": "REVOLUT NEWCO UK LTD",
        "crn": "12871051",
        "company_type": "ltd",
        "company_status": "active",
        "incorporation_date": "2020-09-10",
        "sic_codes": ["64191"],
        "registered_address": "7 Westferry Circus, Canary Wharf, London, E14 4HD, United Kingdom",
        "pscs": [
            {
                "name": "Revolut Group Holdings Ltd",
                "type": "corporate-entity-person-with-significant-control",
                "ownership_pct": 87.5,
                "ownership_band": "ownership-of-shares-75-to-100-percent",
                "natures_of_control": ["ownership-of-shares-75-to-100-percent"],
                "natures_clean": ["75%–100% share ownership"],
                "jurisdiction": "United Kingdom",
                "is_offshore": False,
                "registration_number": "12743095",
                "notified_on": "2020-09-10",
            }
        ],
        "has_no_psc": False,
        "officers": [
            {
                "name": "STORONSKY, Nikolay",
                "role": "director",
                "appointment_date": "2020-09-10",
                "resignation_date": None,
                "is_corporate": False,
                "nationality": "British",
                "country_of_residence": "United Kingdom",
            }
        ],
        "resigned_officer_count": 1,
        "filing_count": 25,
        "cs01_count": 3,
        "aa_count": 3,
        "recent_docs": [],
        "charges": [],
        "has_charges": False,
        "charge_count": 0,
        "last_accounts_date": "2023-12-31",
        "accounts_overdue": False,
        "is_dormant": False,
        "has_insolvency": False,
        "company_status_flag": False,
        "filing_history_raw": [],
    },
}


def normalize_crn(crn: str) -> str:
    cleaned = re.sub(r"[\s\-]+", "", (crn or "")).upper()
    if cleaned.isdigit() and 1 <= len(cleaned) <= 7:
        cleaned = cleaned.zfill(8)
    return cleaned


def _get_api_key() -> str:
    key = os.environ.get("COMPANIES_HOUSE_API_KEY", "").strip()
    if key in ("", "your_key_here", "your_companies_house_api_key"):
        return ""
    return key


def _ch_headers() -> dict:
    key = _get_api_key()
    auth = base64.b64encode(f"{key}:".encode()).decode()
    return {"Authorization": f"Basic {auth}"}


def _parse_ownership_pct(natures: list[str]) -> float:
    for n in natures:
        key = n.lower().replace(" ", "-")
        for band, pct in OWNERSHIP_BAND_MIDPOINTS.items():
            if band in key:
                return pct
    return 0.0


def _detect_offshore(raw_juris: Optional[str]) -> bool:
    if not raw_juris or not raw_juris.strip():
        return False
    clean = raw_juris.lower().strip()
    if clean in ("unknown", "n/a", "not applicable", "none"):
        return False
    for uk in _UK_REGISTRY:
        if uk in clean:
            return False
    for kw in _OFFSHORE_KEYWORDS:
        if kw in clean:
            return True
    return False


def _clean_nature(nature: str) -> str:
    """Convert CH API kebab slug to human-readable text."""
    mapping = {
        "ownership-of-shares-25-to-50-percent":              "25%–50% share ownership",
        "ownership-of-shares-50-to-75-percent":              "50%–75% share ownership",
        "ownership-of-shares-75-to-100-percent":             "75%–100% share ownership",
        "more-than-25-percent-but-not-more-than-50-percent": "25%–50% ownership",
        "more-than-50-percent-but-less-than-75-percent":     "50%–75% ownership",
        "75-percent-or-more":                                "75%+ ownership",
        "voting-rights-25-to-50-percent":                    "25%–50% voting rights",
        "voting-rights-50-to-75-percent":                    "50%–75% voting rights",
        "voting-rights-75-to-100-percent":                   "75%–100% voting rights",
        "right-to-appoint-and-remove-directors":             "Right to appoint/remove directors",
        "significant-influence-or-control":                  "Significant influence or control",
    }
    return mapping.get(nature.lower().replace(" ", "-"), nature.replace("-", " ").title())


def _safe_get(url: str, headers: dict, params: dict = None) -> Optional[dict]:
    try:
        r = requests.get(url, headers=headers, params=params or {}, timeout=12)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def fetch_company_full(crn: str) -> dict:
    """
    Fetch ALL relevant Companies House data for a CRN.
    Returns a rich dict used by ch_parser and risk engine.
    """
    crn = normalize_crn(crn)
    api_key = _get_api_key()

    if not api_key:
        if crn in DEMO_FALLBACK_COMPANIES:
            print(f"\n[CH] No COMPANIES_HOUSE_API_KEY configured — using built-in demo profile for {crn}")
            import copy
            return copy.deepcopy(DEMO_FALLBACK_COMPANIES[crn])
        raise ValueError(
            "COMPANIES_HOUSE_API_KEY is not set in ai-service/.env. "
            "Add your Companies House API key to investigate live CRNs, or try a Demo CRN (09446231, 01683457, 06026625)."
        )

    h = _ch_headers()
    print(f"\n[CH] Fetching full profile for CRN: {crn}")

    # ── 1. Fetch Company Profile with explicit status checks ──────────────────
    try:
        profile_resp = requests.get(f"{CH_BASE}/company/{crn}", headers=h, timeout=12)
    except requests.RequestException as exc:
        raise ValueError(f"Unable to reach Companies House API: {exc}")

    if profile_resp.status_code == 404:
        raise ValueError(f"Company '{crn}' was not found in the UK Companies House registry.")
    if profile_resp.status_code in (401, 403):
        if crn in DEMO_FALLBACK_COMPANIES:
            print(f"[CH] Companies House API key rejected ({profile_resp.status_code}) — falling back to demo data for {crn}")
            import copy
            return copy.deepcopy(DEMO_FALLBACK_COMPANIES[crn])
        raise ValueError(
            f"Companies House API returned HTTP {profile_resp.status_code} (Unauthorized). "
            "Please check that COMPANIES_HOUSE_API_KEY in ai-service/.env is a valid REST API key."
        )
    if profile_resp.status_code == 429:
        raise ValueError("Companies House API rate limit exceeded (HTTP 429). Please wait a moment and try again.")
    if profile_resp.status_code != 200:
        raise ValueError(f"Companies House API returned unexpected status HTTP {profile_resp.status_code} for CRN '{crn}'.")

    profile = profile_resp.json()

    # ── 2. Fetch Secondary Endpoints ──────────────────────────────────────────
    psc_data   = _safe_get(f"{CH_BASE}/company/{crn}/persons-with-significant-control", h)
    officers_r = _safe_get(f"{CH_BASE}/company/{crn}/officers", h)
    filings_r  = _safe_get(f"{CH_BASE}/company/{crn}/filing-history", h)
    charges_r  = _safe_get(f"{CH_BASE}/company/{crn}/charges", h)

    # ── Address ───────────────────────────────────────────────────────────────
    addr = profile.get("registered_office_address", {})
    addr_str = ", ".join(filter(None, [
        addr.get("address_line_1"), addr.get("address_line_2"),
        addr.get("locality"), addr.get("postal_code"), addr.get("country"),
    ]))

    # ── PSCs ──────────────────────────────────────────────────────────────────
    pscs = []
    for item in (psc_data or {}).get("items", []):
        if item.get("ceased_on"):
            continue
        natures = item.get("natures_of_control", [])
        pct = _parse_ownership_pct(natures)

        ident = item.get("identification", {}) or {}
        juris = (
            item.get("country_of_residence")
            or ident.get("place_registered", "")
            or ident.get("country_registered", "")
            or ""
        )
        reg_num = ident.get("registration_number", "") or ""
        is_offshore = _detect_offshore(juris)

        pscs.append({
            "name": item.get("name", "").strip(),
            "type": item.get("kind", "individual-person-with-significant-control"),
            "ownership_pct": pct,
            "ownership_band": natures[0] if natures else "",
            "natures_of_control": natures,
            "natures_clean": [_clean_nature(n) for n in natures],
            "jurisdiction": juris,
            "is_offshore": is_offshore,
            "registration_number": reg_num,
            "notified_on": item.get("notified_on"),
        })
    pscs.sort(key=lambda p: p["ownership_pct"], reverse=True)

    # ── Officers ──────────────────────────────────────────────────────────────
    all_officers = (officers_r or {}).get("items", [])
    active_officers = []
    resigned_count = 0
    for item in all_officers:
        if item.get("resigned_on"):
            resigned_count += 1
            continue
        active_officers.append({
            "name": item.get("name", "").strip(),
            "role": item.get("officer_role", ""),
            "appointment_date": item.get("appointed_on"),
            "resignation_date": None,
            "is_corporate": (
                item.get("identification", {}).get("identification_type") == "registered-company"
                or "corporate" in item.get("officer_role", "").lower()
            ),
            "nationality": item.get("nationality", ""),
            "country_of_residence": item.get("country_of_residence", ""),
        })

    # ── Filing history analysis ───────────────────────────────────────────────
    filings = (filings_r or {}).get("items", [])
    total_filings = (filings_r or {}).get("total_count", len(filings))

    cs01_count = sum(1 for f in filings if f.get("type", "").startswith("CS"))
    aa_count   = sum(1 for f in filings if f.get("type", "").startswith("AA"))

    recent_docs = []
    for f in filings[:10]:
        ftype = f.get("type", "")
        if ftype in ("CS01", "AA", "SH01", "IN01", "PSC01", "PSC02"):
            doc_url = f.get("links", {}).get("document_metadata")
            if doc_url:
                recent_docs.append({
                    "type": ftype,
                    "date": f.get("date", ""),
                    "description": f.get("description", ""),
                    "doc_url": doc_url,
                })
        if len(recent_docs) >= 3:
            break

    # ── Charges ───────────────────────────────────────────────────────────────
    charges = []
    for ch in (charges_r or {}).get("items", []):
        if ch.get("status") == "outstanding":
            charges.append({
                "description": ch.get("classification", {}).get("description", ""),
                "created_on": ch.get("created_on", ""),
                "secured_against": ch.get("secured_details", {}).get("description", ""),
            })

    # ── Accounts status ───────────────────────────────────────────────────────
    acc = profile.get("accounts", {})
    last_accounts_date = acc.get("last_accounts", {}).get("period_end_on", "")
    accounts_overdue = acc.get("overdue", False)
    accounts_type = acc.get("last_accounts", {}).get("type", "")
    is_dormant = accounts_type in ("dormant", "no-accounts-type-available")

    # ── Company status flags ──────────────────────────────────────────────────
    company_status = profile.get("company_status", "active")
    has_insolvency = bool(profile.get("has_insolvency_history", False))
    has_charges = len(charges) > 0

    print(f"[CH] {profile.get('company_name')} | PSCs: {len(pscs)} | Officers: {len(active_officers)} | Filings: {total_filings} | Dormant: {is_dormant}")

    return {
        "company_name": profile.get("company_name", ""),
        "crn": crn,
        "company_type": profile.get("type", ""),
        "company_status": company_status,
        "incorporation_date": profile.get("date_of_creation"),
        "sic_codes": profile.get("sic_codes", []),
        "registered_address": addr_str,
        "pscs": pscs,
        "has_no_psc": len(pscs) == 0,
        "officers": active_officers,
        "resigned_officer_count": resigned_count,
        "filing_count": total_filings,
        "cs01_count": cs01_count,
        "aa_count": aa_count,
        "recent_docs": recent_docs,
        "charges": charges,
        "has_charges": has_charges,
        "charge_count": len(charges),
        "last_accounts_date": last_accounts_date,
        "accounts_overdue": accounts_overdue,
        "is_dormant": is_dormant,
        "has_insolvency": has_insolvency,
        "company_status_flag": company_status not in ("active", ""),
        "filing_history_raw": filings,
    }
