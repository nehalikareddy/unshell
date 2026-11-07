from datetime import date, datetime
from typing import Optional
import networkx as nx


# ── Extended vague/shell SIC codes ───────────────────────────────────────────
VAGUE_SIC_CODES = {
    "74990",  # Non-trading company
    "99999",  # Dormant company
    "74100",  # Activities of head offices (generic holding)
    "82990",  # Other business support service activities
    "70100",  # Activities of head offices
    "74200",  # Photographic activities (often misused)
    "64205",  # Activities of financial holding companies
    "64209",  # Activities of other holding companies
    "64999",  # Other financial service activities
    "66190",  # Other activities auxiliary to financial services
    "70229",  # Management consultancy (catch-all)
}


def build_graph(nodes: list[dict], edges: list[dict]) -> nx.DiGraph:
    G = nx.DiGraph()
    for node in nodes:
        G.add_node(node["id"], **node)
    seen: dict[tuple, float] = {}
    for edge in edges:
        key = (edge["source"], edge["target"])
        trust = edge.get("trust_score", 0.0)
        if key not in seen or trust > seen[key]:
            seen[key] = trust
            G.add_edge(edge["source"], edge["target"], **edge)
    return G


def detect_cycles(graph: nx.DiGraph) -> list[list[str]]:
    if graph.number_of_nodes() == 0:
        return []
    return list(nx.simple_cycles(graph))


def calculate_risk_score(
    nodes: list[dict],
    edges: list[dict],
    graph: nx.DiGraph,
    incorporation_date: Optional[str],
    sic_codes: list[str],
    address: str,
    pscs: list[dict],
    known_shell_addresses: list[str],
    filing_count: int = 0,
    is_dormant: bool = False,
    accounts_overdue: bool = False,
    has_insolvency: bool = False,
    company_status: str = "active",
    charge_count: int = 0,
    resigned_officer_count: int = 0,
    filing_risk_signals: Optional[dict] = None,
) -> tuple[int, list[str], list[str]]:
    score = 0
    fatal_flags: list[str] = []
    cumulative_vectors: list[str] = []

    # ── 1. Aged Shell ─────────────────────────────────────────────────────────
    if incorporation_date:
        try:
            inc = datetime.strptime(incorporation_date, "%Y-%m-%d").date()
            years_old = (date.today() - inc).days / 365.25
            if years_old > 5 and filing_count < 5:
                score += 15
                cumulative_vectors.append("AGED_SHELL")
        except ValueError:
            pass

    # ── 2. Vague / shell SIC code ─────────────────────────────────────────────
    if any(s in VAGUE_SIC_CODES for s in sic_codes):
        score += 15
        cumulative_vectors.append("VAGUE_SIC")

    # ── 3. Boiler room address ────────────────────────────────────────────────
    if address and known_shell_addresses:
        normalized = address.lower().strip()
        if any(normalized in ka.lower() for ka in known_shell_addresses):
            score += 20
            cumulative_vectors.append("BOILER_ROOM")

    # ── 4. Smurf / structuring network ───────────────────────────────────────
    smurf_count = sum(
        1 for p in pscs
        if 15.0 <= float(p.get("ownership_pct", 0)) <= 24.9
    )
    if smurf_count >= 3:
        score += 25
        cumulative_vectors.append("SMURF_NETWORK")

    # ── 4.b Offshore Wall (Offshore PSC or Entity) ───────────────────────────
    has_offshore = any(p.get("is_offshore", False) for p in pscs) or any(
        "OFFSHORE" in (n.get("tags") or []) for n in nodes
    )
    if has_offshore:
        score += 30
        cumulative_vectors.append("OFFSHORE_WALL")

    # ── 5. Dormant company ────────────────────────────────────────────────────
    if is_dormant:
        score += 20
        cumulative_vectors.append("DORMANT_ENTITY")

    # ── 6. Accounts overdue ───────────────────────────────────────────────────
    if accounts_overdue:
        score += 15
        cumulative_vectors.append("ACCOUNTS_OVERDUE")

    # ── 7. Insolvency history ─────────────────────────────────────────────────
    if has_insolvency:
        score += 25
        cumulative_vectors.append("INSOLVENCY_HISTORY")

    # ── 8. Strike-off / dissolved ─────────────────────────────────────────────
    if company_status not in ("active", ""):
        score += 30
        cumulative_vectors.append(f"STATUS_{company_status.upper().replace('-', '_')}")

    # ── 9. High officer turnover ──────────────────────────────────────────────
    if resigned_officer_count >= 5:
        score += 10
        cumulative_vectors.append("HIGH_OFFICER_TURNOVER")

    # ── 9.b Corporate Director ────────────────────────────────────────────────
    corporate_directors = [
        n for n in nodes
        if n.get("tags") and "CORPORATE_DIRECTOR" in n.get("tags")
    ]
    if corporate_directors:
        score += 15
        cumulative_vectors.append("CORPORATE_DIRECTOR")

    # ── 9.c RAG Filing Signals ────────────────────────────────────────────────
    if filing_risk_signals:
        if "SMURF_NETWORK" in filing_risk_signals and "SMURF_NETWORK" not in cumulative_vectors:
            score += 25
            cumulative_vectors.append("SMURF_NETWORK")
        if "BOILER_ROOM" in filing_risk_signals and "BOILER_ROOM" not in cumulative_vectors:
            score += 20
            cumulative_vectors.append("BOILER_ROOM")
        if "NOMINEE_LAYER" in filing_risk_signals and "NOMINEE_LAYER" not in cumulative_vectors:
            score += 20
            cumulative_vectors.append("NOMINEE_LAYER")
        if "VAGUE_SIC" in filing_risk_signals and "VAGUE_SIC" not in cumulative_vectors:
            score += 15
            cumulative_vectors.append("VAGUE_SIC")
        if "HIDDEN_OWNER" in filing_risk_signals:
            score += 30
            fatal_flags.append("HIDDEN_BENEFICIAL_OWNER")

    # ── 10. Corporate Veil / Shell Director Array (No PSCs) ───────────────────
    directors = [n for n in nodes if n.get("role") and "director" in n.get("role").lower()]
    if len(pscs) == 0 and len(directors) >= 3:
        score += 45
        cumulative_vectors.append("OFFSHORE_VEIL")
        if "HIDDEN_BENEFICIAL_OWNER" not in fatal_flags:
            fatal_flags.append("HIDDEN_BENEFICIAL_OWNER")

    # ── 11. Circular ownership loop (FATAL) ───────────────────────────────────
    cycles = detect_cycles(graph)
    if cycles:
        score += 100
        fatal_flags.append("CIRCULAR_LOOP")
        cycle_node_ids = {nid for cycle in cycles for nid in cycle}
        for n in nodes:
            if n["id"] in cycle_node_ids:
                n.setdefault("tags", [])
                if "LOOP" not in n["tags"]:
                    n["tags"].append("LOOP")

    # ── 12. Nominee Puppet — pass-through entity (FATAL) ─────────────────────
    puppet_found = False
    for node_id in graph.nodes():
        if graph.in_degree(node_id) >= 1 and graph.out_degree(node_id) >= 1:
            node_data = graph.nodes.get(node_id, {})
            if node_data.get("type") in ("company", "trust") and not node_data.get("is_target", False):
                puppet_found = True
                for n in nodes:
                    if n["id"] == node_id:
                        n.setdefault("tags", [])
                        if "NOMINEE_PUPPET" not in n["tags"]:
                            n["tags"].append("NOMINEE_PUPPET")
                        if "PUPPET" not in n["tags"]:
                            n["tags"].append("PUPPET")
                        break

    if puppet_found:
        score += 75
        if "NOMINEE_PUPPET" not in fatal_flags:
            fatal_flags.append("NOMINEE_PUPPET")

    return min(score, 100), fatal_flags, cumulative_vectors


def get_risk_label(score: int) -> str:
    if score <= 29:
        return "AUTO_APPROVE"
    if score <= 64:
        return "MEDIUM_RISK"
    if score <= 94:
        return "HIGH_RISK"
    return "CRITICAL"


def get_action_required(score: int, fatal_flags: list[str], sanctions_hit: bool) -> str:
    if sanctions_hit or score >= 95:
        return "SAR Filing Required"
    if score >= 65:
        return "Immediate Rejection"
    if score >= 30:
        return "Human Review"
    return "Auto-Approve"
