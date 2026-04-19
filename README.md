# 🔍 Project Unshell
### Autonomous AML & KYB Intelligence Graph

> **Hackfest 2026 · Team technorev · NMAMIT**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/Orchestration-LangGraph-4A90D9?style=flat-square)](https://langchain-ai.github.io/langgraph/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org)

---

## What is Project Unshell?

Financial criminals don't walk through the front door. They hide behind **layers of shell companies, nominee directors, and offshore trusts** — making it nearly impossible for a compliance analyst to trace the real beneficial owner.

**Project Unshell** is a fully autonomous AML & KYB (Know Your Business) investigation platform. You give it a UK Company Registration Number. It returns a **complete, evidence-backed forensic ownership graph** — with risk scores, sanctions flags, and circular loop detection — in under 10 seconds.

> A task that takes a senior compliance analyst **3 days** takes Unshell less than **10 seconds**.

---

## The Problem It Solves

| Manual KYB Today | With Unshell |
|---|---|
| Analyst reads 50-page PDFs manually | Hyper-RAG pipeline extracts ownership automatically |
| Circular loops missed by human eye | `nx.simple_cycles()` detects mathematically |
| Nominee directors not flagged | Director density algorithm fires NOMINEE_PUPPET |
| OFAC check done separately | Built-in fuzzy SDN match, score → 100 instantly |
| No source evidence | Every claim links to exact PDF page + chunk |
| Days of work | Under 10 seconds |

---

## Architecture

### Full System Architecture

A high-level overview of every component and how they communicate.

```mermaid
flowchart TB
    subgraph Browser["🖥️  Browser  (React 18 + Vite · port 5173)"]
        UI["DualEntryGateway\nCRN Input Form"]
        LS["LoadingScreen\nLive pipeline progress"]
        IV["InvestigationView\nReact Flow ownership graph"]
        UI -->|"user submits CRN"| LS
        LS -->|"result ready"| IV
    end

    subgraph MCP["🔐  MCP Credential Broker  (FastMCP · port 8002)"]
        MCPS["mcp/server.py\nZero-leakage API key proxy"]
    end

    subgraph API["⚙️  FastAPI Backend  (Uvicorn · port 8001)"]
        EP["POST /investigate"]
        EP --> LG
        subgraph LG["LangGraph Pipeline"]
            N1["input_router"] --> N2["fetch_uk_api"]
            N2 --> N3["depth_expand"]
            N3 --> N4["cleanup_graph"]
            N4 --> N5["calculate_risk"]
            N5 --> N6["sanctions_check"]
            N6 --> N7["compile_output"]
        end
    end

    subgraph Data["🗄️  Data Layer"]
        CH["UK Companies House\nREST API (live)"]
        OFAC["OFAC SDN\nSQLite (local)"]
        NX["NetworkX\nIn-memory graph"]
    end

    Browser -->|"HTTP POST"| EP
    MCP -->|"injects API keys"| N2
    N2 -->|"fetch company data"| CH
    N5 -->|"cycle detection\ndirector density"| NX
    N6 -->|"fuzzy name match"| OFAC
    N7 -->|"JSON graph + risk score"| Browser

    style Browser fill:#f0ede5,stroke:#ccc,color:#111
    style API fill:#1a1a2e,stroke:none,color:#a5b4fc
    style MCP fill:#2d1b69,stroke:none,color:#c4b5fd
    style Data fill:#083344,stroke:none,color:#7dd3fc
    style LG fill:#0f172a,stroke:#334155,color:#94a3b8
```

---

### LangGraph Investigation Pipeline

The investigation runs as a **6-node LangGraph stateful pipeline** — each node is a discrete Python function wired together by LangGraph's state machine.

```mermaid
flowchart TD
    A([" CRN Input"]) --> B

    B["**input_router**
    Sets thread ID
    Marks status in_progress"]
    B --> C

    C["**fetch_uk_api**
    Companies House REST API
    Profile · PSCs · Officers · Filing history"]
    C --> D

    D["**depth_expand**
    Recursively fetches every corporate PSC
    Level 2 ownership expansion"]
    D --> E

    E["**cleanup_graph**
    Removes floating orphan nodes
    Tags the resolved UBO node"]
    E --> F

    F["**calculate_risk**
    NetworkX math engine
    nx.simple_cycles() · Director density · Offshore flags"]
    F --> G

    G["**sanctions_check**
    RapidFuzz fuzzy match
    Against local OFAC SDN SQLite database"]
    G --> H

    H["**compile_output**
    Builds final JSON payload
    Graph · Risk score · Fatal flags · Evidence"]
    H --> I([" React Flow UI"])

    style A fill:#0A0A0A,color:#fff,stroke:none
    style I fill:#0A0A0A,color:#fff,stroke:none
    style B fill:#F7F5F0,stroke:#ccc,color:#111
    style C fill:#F7F5F0,stroke:#ccc,color:#111
    style D fill:#F7F5F0,stroke:#ccc,color:#111
    style E fill:#F7F5F0,stroke:#ccc,color:#111
    style F fill:#1a1a2e,color:#a5b4fc,stroke:none
    style G fill:#1a1a2e,color:#a5b4fc,stroke:none
    style H fill:#F7F5F0,stroke:#ccc,color:#111
```

---

### Hyper-RAG Pipeline (Document Mode)

When an offshore PDF is uploaded, a 4-stage pipeline extracts ownership entities from unstructured legal documents.

```mermaid
flowchart LR
    P([" PDF Upload"]) --> R1

    R1["**R1 · PyMuPDF Ingest**
    Extracts raw text blocks
    page by page"]
    R1 --> R2

    R2["**R2 · FAISS Index**
    Chunks text · Sentence Transformers
    Builds vector index in memory"]
    R2 --> R3

    R3["**R3 · NVIDIA Mistral NIM**
    Queries index semantically
    Extracts ownership entities
    and percentages"]
    R3 --> R4

    R4{{"**R4 · RapidFuzz Firewall**
    Every AI claim cross-verified
    against raw PDF chunks"}}

    R4 -->|" Verified"| OK(["Merged into
    Ownership Graph"])
    R4 -->|" No match in source"| DROP(["Silently
    Dropped"])

    style P fill:#0A0A0A,color:#fff,stroke:none
    style R1 fill:#F7F5F0,stroke:#ccc,color:#111
    style R2 fill:#F7F5F0,stroke:#ccc,color:#111
    style R3 fill:#1a1a2e,color:#a5b4fc,stroke:none
    style R4 fill:#6d28d9,color:#fff,stroke:none
    style OK fill:#166534,color:#fff,stroke:none
    style DROP fill:#991b1b,color:#fff,stroke:none
```

> **Zero-Trust AI:** The RapidFuzz Firewall (R4) is our core differentiator. An AI claim only reaches the graph if the entity name and percentage can be found verbatim in the raw source document. Unverified claims are silently dropped — no hallucinations reach the output.

---

## Risk Scoring Engine

The `NetworkX` graph engine runs **6 deterministic risk vectors** — pure math, zero AI opinion:

| Flag | Trigger | Score Impact |
|---|---|---|
| `CIRCULAR_LOOP` | `nx.simple_cycles()` detects ownership cycle | +100 (Fatal) |
| `NOMINEE_PUPPET` | Director appointed across 100+ companies | +75 (Fatal) |
| `OFAC_MATCH` | RapidFuzz match on US Treasury SDN list | Score → 100 |
| `OFFSHORE_WALL` | PSC jurisdiction outside UK/EEA | +30 |
| `AGED_SHELL` | Incorporation >10yrs, <5 filings | +15 |
| `VAGUE_SIC` | High-risk SIC code (74990, 99999) | +10 |

**Score thresholds:** `< 30` Auto-Approve · `30–64` Human Review · `65–94` Auto-Reject · `≥ 95` SAR Filing Required

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite, React Flow (ownership graph), vanilla CSS |
| **Backend** | FastAPI + asyncio, Uvicorn |
| **Orchestration** | LangGraph (stateful 6-node workflow) |
| **AI Extraction** | NVIDIA NIM Mistral (structured entity extraction) |
| **PDF Reading** | Google Gemini 2.5 Flash (document mode) |
| **RAG Engine** | PyMuPDF + Sentence Transformers + FAISS |
| **Verification** | RapidFuzz token-sort firewall (Zero-Trust AI) |
| **Graph Math** | NetworkX (topology, cycle detection, centrality) |
| **Sanctions** | SQLite OFAC SDN database (local, offline) |
| **Data Broker** | FastMCP server (port 8002) — zero credential leakage |

---

## Project Structure

```
unshell/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── agent/
│   │   ├── orchestrator.py      # LangGraph 6-node pipeline
│   │   └── state.py             # InvestigationState TypedDict
│   ├── ai/
│   │   ├── fetch_ch.py          # Companies House API client
│   │   ├── ch_parser.py         # PSC/officer → graph node parser
│   │   └── gemini_extractor.py  # Gemini PDF extraction (doc mode)
│   ├── graph/
│   │   └── engine.py            # NetworkX risk scoring engine
│   ├── mcp/
│   │   └── server.py            # FastMCP credential broker
│   ├── data/
│   │   └── sanctions.db         # OFAC SDN SQLite database
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── api/client.js        # Backend API calls
        └── components/
            ├── DualEntryGateway.jsx   # Landing / CRN input
            ├── LoadingScreen.jsx      # Investigation progress UI
            ├── InvestigationView.jsx  # Main dashboard
            ├── CustomNode.jsx         # React Flow graph node
            └── RiskScoreboard.jsx     # Risk score bottom bar
```

---

## Setup & Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- API keys (see below)

### 1. Clone & configure

```bash
git clone https://github.com/hackfest-dev/HF26-26.git
cd HF26-26
```

Create `backend/.env`:

```env
COMPANIES_HOUSE_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
NVIDIA_API_KEY=your_key_here
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8001
```

### 3. MCP Server (separate terminal)

```bash
cd backend
python mcp/server.py
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### Demo CRNs to Try

| Company | CRN | Expected Result |
|---|---|---|
| Monzo Bank | `09446231` | Low risk, clean structure |
| IBS Group | `01683457` | Medium risk |
| Seabon Ltd | `06026625` | Critical — OFAC linked |

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Service health check |
| `/investigate` | POST | `{ "crn": "09446231" }` → full investigation |

---

## How to Get API Keys

| Key | Where to Get |
|---|---|
| Companies House | [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk) — free |
| Gemini | [aistudio.google.com](https://aistudio.google.com) — free tier |
| NVIDIA NIM | [build.nvidia.com](https://build.nvidia.com) — free credits |

---

## Screenshots

### 1. Landing Page — Start an Investigation

Enter any UK Company Registration Number (CRN) and hit **Investigate**. Three demo companies are pre-loaded — Monzo (low risk), IBS (medium), and Seabon (critical OFAC-linked) — so you can jump straight into a live investigation. The system runs entirely off the UK Companies House public API with no manual data entry required.

<img width="1919" height="968" alt="Landing Page" src="https://github.com/user-attachments/assets/091c8731-a637-4184-a9e4-1d9db48449dc" />

---

### 2. Investigation in Progress — Live Pipeline View

Once you submit a CRN, Unshell's 6-stage autonomous pipeline kicks in. Each step completes in real time — from fetching the company registry and building the ownership graph, to running cycle detection and screening against OFAC sanctions. The orbital spinner on the left confirms the pipeline is actively running. Progress is tracked as a step counter (e.g. `3/6`).

<img width="1919" height="968" alt="Loading Screen" src="https://github.com/user-attachments/assets/091c8731-a637-4184-a9e4-1d9db48449dc" />

---

### 3. Full Forensic Dashboard — SATUS 2026-1 PLC

This is the complete investigation output. **SATUS 2026-1 PLC** returned a **Risk Score of 90/100** triggering an **AUTO REJECT** verdict. The graph reveals a classic nominee puppet structure — a holding company flagged as `NOMINEE PUPPET` holds over 75% shares, controlled by a corporate director network. The left sidebar shows all 6 entities, 1 puppet detected, depth-2 chain traced, and the exact rejection rationale. Every edge on the graph is clickable, showing the source evidence behind each relationship.

<img width="1913" height="980" alt="Dashboard" src="https://github.com/user-attachments/assets/177832c8-d2f6-483a-bb9d-54ac145244d2" />

---

## Team

**Team technorev · NMAMIT · Hackfest 2026**

| Role | Name |
|---|---|
| LangGraph & Backend | Srihari BT |
| Backend | Hanumaditya |
| Frontend | Nehalika |
| Frontend | Sagar |

---

## License

MIT © 2026 Team technorev
