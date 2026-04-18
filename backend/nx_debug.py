from dotenv import load_dotenv; load_dotenv()
from ai.fetch_ch import fetch_company_full
from ai.ch_parser import parse_companies_house_data
from graph.engine import build_graph, detect_cycles, calculate_risk_score
import networkx as nx

raw = fetch_company_full('09638788')
nodes, edges, officers = parse_companies_house_data(raw)
G = build_graph(nodes, edges)

print('=== NETWORKX GRAPH ANALYSIS ===')
print('Nodes:', list(G.nodes()))
print('Edges:', list(G.edges()))
print('Cycles:', detect_cycles(G))
print()
for nid in G.nodes():
    nd_type = G.nodes[nid].get('type')
    print(f'  Node [{nid}]: in={G.in_degree(nid)}, out={G.out_degree(nid)}, type={nd_type}')

print()
print('Degree centrality:', nx.degree_centrality(G))
print()
print('=== COMPANY RISK DATA ===')
print('Status:', raw['company_status'])
print('Dormant:', raw['is_dormant'])
print('Accounts overdue:', raw['accounts_overdue'])
print('Incorporation:', raw['incorporation_date'])
print('SIC:', raw['sic_codes'])
print('Filings:', raw['filing_count'])
print()
score, fatal, vectors = calculate_risk_score(
    nodes=nodes, edges=edges, graph=G,
    incorporation_date=raw['incorporation_date'],
    sic_codes=raw['sic_codes'],
    address=raw['registered_address'],
    pscs=raw['pscs'],
    known_shell_addresses=[],
    filing_count=raw['filing_count'],
    is_dormant=raw['is_dormant'],
    accounts_overdue=raw['accounts_overdue'],
    has_insolvency=raw['has_insolvency'],
    company_status=raw['company_status'],
    charge_count=raw['charge_count'],
    resigned_officer_count=raw['resigned_officer_count'],
)
print('=== RISK ENGINE OUTPUT ===')
print('Score:', score)
print('Fatal flags:', fatal)
print('Vectors:', vectors)
