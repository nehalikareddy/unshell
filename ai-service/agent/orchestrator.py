import os
import re
import uuid
import base64
import sqlite3
from pathlib import Path

import requests
import networkx as nx
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv()

from agent.state import InvestigationState
from ai.ch_parser import parse_companies_house_data
from ai.fetch_ch import fetch_company_full, normalize_crn
from ai.gemini_extractor import extract_ownership_from_pdf, convert_extraction_to_graph_format
from graph.engine import build_graph, calculate_risk_score, get_risk_label, get_action_required

# ── Constants ─────────────────────────────────────────────────────────────────
CH_BASE = "https://api.company-information.service.gov.uk"


def _ch_headers() -> dict:
    ch_key = os.environ.get("COMPANIES_HOUSE_API_KEY", "").strip()
    auth = base64.b64encode(f"{ch_key}:".encode()).decode()
    return {"Authorization": f"Basic {auth}"}


# ── Database helpers ──────────────────────────────────────────────────────────
def query_ofac(name: str) -> dict:
    name = name.strip()
    if not name or name.startswith("Unresolved") or name in ("UNKNOWN", "UNKNOWN (OFFSHORE)"):
        return {"match": False, "detail": "No name provided", "program": "", "matched_name": ""}

    db_path = os.path.join(os.path.dirname(__file__), "..", "data", "sanctions.db")
    if not os.path.exists(db_path):
        print(f"[OFAC] WARNING: {db_path} not found. Returning safe.")
        return {"match": False, "detail": "No OFAC match found", "program": "", "matched_name": ""}

    words = [w.strip(",.") for w in name.split() if len(w.strip(",.")) >= 4]
    try:
        with sqlite3.connect(db_path) as db:
            db.row_factory = sqlite3.Row
            cursor = db.execute("SELECT * FROM sdn_list WHERE UPPER(name) LIKE UPPER(?)", (f"%{name}%",))
            row = cursor.fetchone()
            if row:
                return {
                    "match": True,
                    "detail": f"OFAC SDN match: {dict(row).get('name')}",
                    "program": dict(row).get("program", ""),
                    "matched_name": dict(row).get("name", ""),
                }
            for word in words:
                cursor = db.execute("SELECT * FROM sdn_list WHERE UPPER(name) LIKE UPPER(?)", (f"%{word}%",))
                row = cursor.fetchone()
                if row:
                    return {
                        "match": True,
                        "detail": f"OFAC SDN partial match on '{word}': {dict(row).get('name')}",
                        "program": dict(row).get("program", ""),
                        "matched_name": dict(row).get("name", ""),
                    }
    except Exception as e:
        print(f"[OFAC ERROR] {e}")
    return {"match": False, "detail": "No OFAC match found", "program": "", "matched_name": ""}


def get_known_addresses() -> list[str]:
    db_path = os.path.join(os.path.dirname(__file__), "..", "data", "known_addresses.db")
    if not os.path.exists(db_path):
        return []
    try:
        with sqlite3.connect(db_path) as db:
            cursor = db.execute("SELECT address_text FROM shell_addresses")
            return [r[0] for r in cursor.fetchall()]
    except Exception as e:
        print(f"[ADDRESSES ERROR] {e}")
        return []


# ── LangGraph Nodes ───────────────────────────────────────────────────────────
def input_router_node(state: InvestigationState) -> InvestigationState:
    state["status"] = "in_progress"
    state["thread_id"] = str(uuid.uuid4())
    state["target_identifier"] = normalize_crn(state["target_identifier"])
    return state


def fetch_uk_api_node(state: InvestigationState) -> InvestigationState:
    crn = state["target_identifier"]

    raw_data = fetch_company_full(crn)
    nodes, edges, active_officers = parse_companies_house_data(raw_data)

    state["discovered_nodes"] = nodes
    state["discovered_edges"] = edges
    state["incorporation_date"] = raw_data.get("incorporation_date", "")
    state["sic_codes"] = raw_data.get("sic_codes", [])
    state["registered_address"] = raw_data.get("registered_address", "")
    state["filing_count"] = raw_data.get("filing_count", 0)
    state["pscs"] = raw_data.get("pscs", [])
    state["_raw_data"] = raw_data
    state["_active_officers"] = active_officers

    # Extended risk signals
    state["_is_dormant"] = raw_data.get("is_dormant", False)
    state["_accounts_overdue"] = raw_data.get("accounts_overdue", False)
    state["_has_insolvency"] = raw_data.get("has_insolvency", False)
    state["_company_status"] = raw_data.get("company_status", "active")
    state["_charge_count"] = raw_data.get("charge_count", 0)
    state["_resigned_officer_count"] = raw_data.get("resigned_officer_count", 0)

    offshore_psc_count = sum(1 for psc in state["pscs"] if psc.get("is_offshore", False))
    offshore_node_count = sum(1 for n in nodes if "OFFSHORE" in n.get("tags", []))
    state["offshore_dead_end"] = (offshore_psc_count > 0) or (offshore_node_count > 0)

    # ── UBO Extraction ────────────────────────────────────────────────────────
    pscs = state["pscs"]

    if not pscs:
        state["resolved_ubo"] = "Unresolved — No PSC Registered (EDD Required)"
        state["_ubo_type"] = "unknown"
    elif offshore_psc_count > 0:
        top_offshore = next((p for p in pscs if p.get("is_offshore", False)), pscs[0])
        state["resolved_ubo"] = f"Unresolved — Offshore Entity: {top_offshore['name']}"
        state["_ubo_type"] = "offshore"
    else:
        individual_pscs = [
            p for p in pscs
            if "individual" in p.get("type", "").lower()
            and not p.get("is_offshore", False)
        ]
        if individual_pscs:
            top_individual = individual_pscs[0]
            state["resolved_ubo"] = top_individual["name"]
            state["_ubo_type"] = "individual"
        else:
            state["resolved_ubo"] = "Unresolved — Corporate Chain (EDD Required)"
            state["_ubo_type"] = "corporate_chain"

    return state


def _expand_corporate_psc_depth(state: InvestigationState) -> InvestigationState:
    """
    Level 2 Depth Expansion: For every Corporate PSC found at Level 1,
    fetch its own Companies House PSCs/officers and add them as Level 2 nodes.
    """
    existing_labels = {n["label"].lower() for n in state["discovered_nodes"]}
    existing_edge_ids = {e["id"] for e in state["discovered_edges"]}
    new_depth_nodes = 0

    corporate_pscs = [
        n for n in state["discovered_nodes"]
        if "CORPORATE_PSC" in n.get("tags", []) and not n.get("is_target", False)
    ]

    for corp_node in corporate_pscs:
        corp_label = corp_node["label"]
        corp_id = corp_node["id"]
        child_crn = normalize_crn(corp_node.get("registration_number", ""))
        child_name = corp_label

        try:
            if not child_crn:
                headers = _ch_headers()
                search_r = requests.get(
                    f"{CH_BASE}/search/companies",
                    headers=headers,
                    params={"q": corp_label, "items_per_page": 1},
                    timeout=8,
                )
                if search_r.status_code != 200:
                    continue
                items = search_r.json().get("items", [])
                if not items:
                    continue
                child_crn = normalize_crn(items[0].get("company_number", ""))
                child_name = items[0].get("title", corp_label)
                child_status = items[0].get("company_status", "")
                if not child_crn or child_status not in ("active", ""):
                    continue

            print(f"[DEPTH-2] >> Expanding: {child_name} ({child_crn})")
            child_raw = fetch_company_full(child_crn)
            child_nodes, _, _ = parse_companies_house_data(child_raw)

            for node in child_nodes:
                if node.get("is_target") or node.get("id") == "no_psc_registered":
                    continue
                if node["label"].lower() not in existing_labels:
                    node["depth"] = 2
                    node["tags"] = node.get("tags", []) + ["DEPTH_2"]
                    state["discovered_nodes"].append(node)
                    existing_labels.add(node["label"].lower())
                    new_depth_nodes += 1

                    # If Level-1 was an unresolved corporate chain and Level-2 reveals a human PSC, resolve UBO
                    if (
                        state.get("_ubo_type") == "corporate_chain"
                        and node.get("type") == "individual"
                        and not node.get("is_offshore", False)
                        and (node.get("ownership_pct") or 0) > 0
                    ):
                        state["resolved_ubo"] = node["label"]
                        state["_ubo_type"] = "individual"

                    edge_id = f"d2_{node['id']}_to_{corp_id}"
                    if edge_id not in existing_edge_ids:
                        state["discovered_edges"].append({
                            "id": edge_id,
                            "source": node["id"],
                            "target": corp_id,
                            "label": "controls (chain)",
                            "ownership_pct": node.get("ownership_pct"),
                            "trust_score": 1.0,
                            "evidence_snippet": f"Depth-2: {node['label']} controls {child_name}",
                            "source_doc": "Companies House API (Depth-2)",
                            "source_page": None,
                        })
                        existing_edge_ids.add(edge_id)
        except Exception as e:
            print(f"[DEPTH-2] WARN Failed: {corp_label}: {e}")
            continue

    if new_depth_nodes > 0:
        print(f"[DEPTH-2] OK Added {new_depth_nodes} Level-2 nodes")
    return state


def cleanup_graph_node(state: InvestigationState) -> InvestigationState:
    """
    Pre-risk cleanup:
    1. Remove floating nodes (no edges connecting them)
    2. Tag the resolved UBO node with 'UBO' badge ONLY when a real individual UBO is resolved
    """
    nodes = state["discovered_nodes"]
    edges = state["discovered_edges"]

    connected_ids = set()
    for e in edges:
        connected_ids.add(e["source"])
        connected_ids.add(e["target"])

    if connected_ids:
        before_count = len(nodes)
        nodes = [n for n in nodes if n["id"] in connected_ids]
        removed = before_count - len(nodes)
        if removed > 0:
            print(f"[CLEANUP] Removed {removed} floating/orphan nodes")

    # Only tag UBO when an actual individual UBO was resolved
    if state.get("_ubo_type") == "individual":
        resolved_ubo = state.get("resolved_ubo", "")
        ubo_name_clean = resolved_ubo.replace(" (PDF Verified)", "").lower().strip()
        if ubo_name_clean and not ubo_name_clean.startswith("unresolved"):
            for node in nodes:
                if node.get("is_target") or node.get("id") == "no_psc_registered":
                    continue
                node_label_clean = node.get("label", "").lower().strip()
                ubo_parts = set(ubo_name_clean.replace(",", " ").split())
                node_parts = set(node_label_clean.replace(",", " ").split())
                if len(ubo_parts & node_parts) >= 2 or ubo_name_clean == node_label_clean:
                    node.setdefault("tags", [])
                    if "UBO" not in node["tags"]:
                        node["tags"].append("UBO")
                        print(f"[CLEANUP] Tagged UBO node: {node['label']}")
                    break

    state["discovered_nodes"] = nodes
    return state


def calculate_risk_node(state: InvestigationState) -> InvestigationState:
    known_shells = get_known_addresses()
    state["known_shell_addresses"] = known_shells

    graph = build_graph(state["discovered_nodes"], state["discovered_edges"])
    state["networkx_graph"] = None

    score, fatal_flags, cumulative_vectors = calculate_risk_score(
        nodes=state["discovered_nodes"],
        edges=state["discovered_edges"],
        graph=graph,
        incorporation_date=state["incorporation_date"],
        sic_codes=state["sic_codes"],
        address=state["registered_address"],
        pscs=state["pscs"],
        known_shell_addresses=known_shells,
        filing_count=state["filing_count"],
        is_dormant=state.get("_is_dormant", False),
        accounts_overdue=state.get("_accounts_overdue", False),
        has_insolvency=state.get("_has_insolvency", False),
        company_status=state.get("_company_status", "active"),
        charge_count=state.get("_charge_count", 0),
        resigned_officer_count=state.get("_resigned_officer_count", 0),
        filing_risk_signals=state.get("_filing_risk_signals", {}),
    )

    state["current_risk_score"] = score
    state["fatal_flags"] = fatal_flags
    state["cumulative_vectors"] = cumulative_vectors

    overall_label = get_risk_label(score)

    # Update per-node tags and risk_level so EntitySidebar & CustomNode display accurate colors
    for node in state["discovered_nodes"]:
        tags = node.setdefault("tags", [])
        jurisdiction = (node.get("jurisdiction") or "").lower().strip()
        if jurisdiction and jurisdiction not in (
            "england", "wales", "scotland", "northern ireland", "united kingdom", "uk", "gb", "unknown"
        ):
            if node.get("is_offshore") and "OFFSHORE" not in tags:
                tags.append("OFFSHORE")

        if "OFAC" in tags or "LOOP" in tags:
            node["risk_level"] = "CRITICAL"
        elif "PUPPET" in tags or "NOMINEE_PUPPET" in tags or "OFFSHORE" in tags or "CORPORATE_DIRECTOR" in tags:
            node["risk_level"] = "HIGH_RISK"
        elif "NO_PSC" in tags or "DEAD_END" in tags:
            node["risk_level"] = "MEDIUM_RISK"
        elif node.get("is_target"):
            node["risk_level"] = overall_label
        else:
            node["risk_level"] = "AUTO_APPROVE"

    return state


def sanctions_check_node(state: InvestigationState) -> InvestigationState:
    ubo_name = state["resolved_ubo"]
    ofac_result = query_ofac(ubo_name)

    if ofac_result["match"]:
        state["sanctions_hit"] = True
        state["sanctions_detail"] = f"{ofac_result['matched_name']} - {ofac_result['program']}"
        state["current_risk_score"] = 100
        if "OFAC_MATCH" not in state["fatal_flags"]:
            state["fatal_flags"].append("OFAC_MATCH")
        for node in state["discovered_nodes"]:
            if node.get("label", "").lower() in (ubo_name.lower(), ofac_result["matched_name"].lower()):
                node.setdefault("tags", [])
                if "OFAC" not in node["tags"]:
                    node["tags"].append("OFAC")
                node["risk_level"] = "CRITICAL"
    else:
        state["sanctions_hit"] = False
        state["sanctions_detail"] = ""

    return state


def compile_output_node(state: InvestigationState) -> InvestigationState:
    score = state["current_risk_score"]
    sanctions_hit = state["sanctions_hit"]

    status = "auto_reject" if (score >= 95 or sanctions_hit) else "complete"
    risk_label = get_risk_label(score)
    action_required = get_action_required(score, state["fatal_flags"], sanctions_hit)

    graph = build_graph(state["discovered_nodes"], state["discovered_edges"])
    jurisdictions = set(node.get("jurisdiction", "Unknown") for node in state["discovered_nodes"])

    try:
        cycles_len = len(list(nx.simple_cycles(graph))) if graph else 0
    except Exception:
        cycles_len = 0

    edges = state["discovered_edges"]
    connected_ids = set()
    for e in edges:
        connected_ids.add(e["source"])
        connected_ids.add(e["target"])

    clean_nodes = (
        [n for n in state["discovered_nodes"] if n["id"] in connected_ids]
        if connected_ids
        else state["discovered_nodes"]
    )

    pdf_verified = any("PDF_VERIFIED" in n.get("tags", []) for n in clean_nodes)
    ubo_type = state.get("_ubo_type", "unknown")
    active_officers = state.get("_active_officers", [])

    conf_score = 100
    if not pdf_verified:
        conf_score -= 15
    if ubo_type == "corporate_chain":
        conf_score -= 25
    if ubo_type == "unknown":
        conf_score -= 40
    if state.get("offshore_dead_end"):
        conf_score -= 20

    is_dead_end = ubo_type in ("unknown", "offshore") or state.get("offshore_dead_end", False)

    final_payload = {
        "crn": state["target_identifier"],
        "status": status,
        "thread_id": state["thread_id"],
        "risk_score": score,
        "risk_label": risk_label,
        "confidence_score": max(conf_score, 0),
        "fatal_flags": state["fatal_flags"],
        "cumulative_vectors": state["cumulative_vectors"],
        "action_required": action_required,
        "resolved_ubo": state["resolved_ubo"],
        "ubo_type": ubo_type,
        "sanctions_hit": sanctions_hit,
        "sanctions_detail": state["sanctions_detail"],
        "pdf_verified": pdf_verified,
        "is_dead_end": is_dead_end,
        "officers": active_officers,
        "graph": {
            "nodes": clean_nodes,
            "edges": state["discovered_edges"],
        },
        "stats": {
            "total_entities": len(clean_nodes),
            "loops_detected": cycles_len,
            "puppets_detected": sum(1 for f in state["fatal_flags"] if f == "NOMINEE_PUPPET"),
            "jurisdictions": list(jurisdictions),
            "investigation_depth": max(
                2 if any("DEPTH_2" in n.get("tags", []) for n in clean_nodes) else 1,
                2 if pdf_verified else 1,
            ),
        },
    }

    state["final_payload"] = final_payload
    state["status"] = status
    return state


def build_investigation_graph() -> StateGraph:
    workflow = StateGraph(InvestigationState)

    workflow.add_node("input_router",    input_router_node)
    workflow.add_node("fetch_uk_api",    fetch_uk_api_node)
    workflow.add_node("depth_expand",    _expand_corporate_psc_depth)
    workflow.add_node("cleanup_graph",   cleanup_graph_node)
    workflow.add_node("calculate_risk",  calculate_risk_node)
    workflow.add_node("sanctions_check", sanctions_check_node)
    workflow.add_node("compile_output",  compile_output_node)

    workflow.set_entry_point("input_router")
    workflow.add_edge("input_router",    "fetch_uk_api")
    workflow.add_edge("fetch_uk_api",    "depth_expand")
    workflow.add_edge("depth_expand",    "cleanup_graph")
    workflow.add_edge("cleanup_graph",   "calculate_risk")
    workflow.add_edge("calculate_risk",  "sanctions_check")
    workflow.add_edge("sanctions_check", "compile_output")
    workflow.add_edge("compile_output",  END)

    checkpointer = MemorySaver()
    return workflow.compile(checkpointer=checkpointer)


def run_investigation(crn: str) -> dict:
    app = build_investigation_graph()
    initial_state = {
        "mode": "api",
        "target_identifier": normalize_crn(crn),
        "raw_pdf_bytes": None,
        "discovered_nodes": [],
        "discovered_edges": [],
        "networkx_graph": None,
        "incorporation_date": "",
        "sic_codes": [],
        "registered_address": "",
        "filing_count": 0,
        "pscs": [],
        "offshore_dead_end": False,
        "resolved_ubo": "",
        "known_shell_addresses": [],
        "current_risk_score": 0,
        "fatal_flags": [],
        "cumulative_vectors": [],
        "sanctions_hit": False,
        "sanctions_detail": "",
        "status": "in_progress",
        "thread_id": "",
        "final_payload": {},
        "_raw_data": {},
        "_active_officers": [],
        "_ubo_type": "unknown",
        "_is_dormant": False,
        "_accounts_overdue": False,
        "_has_insolvency": False,
        "_company_status": "active",
        "_charge_count": 0,
        "_resigned_officer_count": 0,
        "_filing_risk_signals": {},
        "_filing_smurf_evidence": None,
        "_filing_boiler_evidence": None,
        "_filing_nominee_evidence": None,
        "_filing_vague_sic_evidence": None,
        "_filing_hidden_owner_evidence": None,
    }
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    result = app.invoke(initial_state, config)
    return result["final_payload"]


def run_investigation_document(pdf_bytes: bytes, filename: str = "document.pdf") -> dict:
    """Document upload path — Gemini/NIM/OpenRouter reads your uploaded PDF."""
    print(f"\n[DOCUMENT] Extracting ownership from: {filename}\n")

    extraction = extract_ownership_from_pdf(pdf_bytes)
    nodes, edges = convert_extraction_to_graph_format(extraction, document_name=filename)

    known_shells = get_known_addresses()
    graph = build_graph(nodes, edges)
    score, fatal_flags_raw, cumulative_vectors_raw = calculate_risk_score(
        nodes=nodes,
        edges=edges,
        graph=graph,
        incorporation_date="",
        sic_codes=[],
        address="",
        pscs=[],
        known_shell_addresses=known_shells,
        filing_count=0,
    )

    resolved_ubo = "UNKNOWN"
    for entity in extraction.entities:
        if entity.type == "individual":
            resolved_ubo = entity.name
            break

    fatal_flags = list(fatal_flags_raw)
    sanctions_hit = False
    sanctions_detail = ""
    if resolved_ubo != "UNKNOWN":
        ofac = query_ofac(resolved_ubo)
        if ofac.get("match"):
            sanctions_hit = True
            sanctions_detail = f"{ofac['matched_name']} - {ofac['program']}"
            if "OFAC_MATCH" not in fatal_flags:
                fatal_flags.append("OFAC_MATCH")

    score = 100 if sanctions_hit else score
    risk_label = get_risk_label(score)
    status = "auto_reject" if (score >= 95 or sanctions_hit) else "complete"
    action = get_action_required(score, fatal_flags, sanctions_hit)
    jurisdictions = list(set(n.get("jurisdiction", "Unknown") for n in nodes))

    try:
        cycles_len = len(list(nx.simple_cycles(graph))) if graph else 0
    except Exception:
        cycles_len = 0

    return {
        "crn": filename,
        "status": status,
        "thread_id": str(uuid.uuid4()),
        "risk_score": score,
        "risk_label": risk_label,
        "fatal_flags": fatal_flags,
        "cumulative_vectors": cumulative_vectors_raw,
        "action_required": action,
        "resolved_ubo": resolved_ubo,
        "sanctions_hit": sanctions_hit,
        "sanctions_detail": sanctions_detail,
        "pdf_verified": True,
        "is_dead_end": resolved_ubo == "UNKNOWN",
        "document_type": extraction.document_type,
        "extraction_confidence": extraction.extraction_confidence,
        "warnings": extraction.warnings,
        "graph": {"nodes": nodes, "edges": edges},
        "stats": {
            "total_entities": len(nodes),
            "loops_detected": cycles_len,
            "puppets_detected": sum(1 for f in fatal_flags if f == "NOMINEE_PUPPET"),
            "jurisdictions": jurisdictions,
            "investigation_depth": 2,
        },
    }
