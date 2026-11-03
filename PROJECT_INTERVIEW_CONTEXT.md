# 🛡️ UNSHELL // Technical Briefing & Project Context Document
> **Purpose**: This document provides an exhaustive, end-to-end technical overview of the **Unshell** codebase. It is designed to give an AI interviewer complete context on architecture, engineering decisions, algorithms, data flows, schemas, security models, trade-offs, and interview question-answer guides.

---

## 1. Executive Summary & Pitch

* **Project Name**: Unshell (formerly Project Fusion)
* **Tagline**: Autonomous AML & KYB Forensic Intelligence Graph
* **Elevator Pitch**: 
  Financial criminals, tax evaders, and sanctioned oligarchs routinely obscure beneficial ownership behind dense networks of nominee directors, offshore shell entities, and circular holding structures. 
  For a senior compliance analyst, manually unravelling a single corporate structure using corporate registries and sanction lists takes **2 to 3 days**. 
  **Unshell** automates the entire investigation in **under 10 seconds**: given a UK Company Registration Number (CRN) or corporate filing document (PDF), it traverses multi-tier ownership chains, resolves the Ultimate Beneficial Owner (UBO), detects circular ownership loops using deterministic graph math, screens against global sanctions databases, calculates explainable risk scores, and visualizes an interactive forensic graph.

---

## 2. Problem Statement & Domain Context (AML / KYB)

### The Challenge in Modern KYB (Know Your Business)
1. **Layering & Shell Companies**: Shell companies exist across multiple jurisdictions without physical offices or active operations. Holding company A owns company B, which is owned by trust C in the Cayman Islands.
2. **Circular Ownership**: Bad actors create circular corporate ownership loops (A owns B, B owns C, C owns A) to evade legal thresholds (>25% shareholding) defining a Person with Significant Control (PSC).
3. **Nominee / Puppet Directors**: Corporate service providers appoint "straw men" or puppet directors who sign filings on behalf of hundreds or thousands of front companies simultaneously.
4. **Unstructured Data in Registry Filings**: Crucial ownership and share allocations are frequently buried inside scanned PDF incorporation deeds (`IN01` filings) rather than structured JSON APIs.
5. **Regulatory Necessity**: Under the UK Economic Crime and Corporate Transparency Act and international Financial Action Task Force (FATF) standards, financial institutions must identify and verify the real living human behind an entity (the Ultimate Beneficial Owner, or UBO).

---

## 3. High-Level Architecture

Unshell uses a **3-tier decoupled microservice architecture** separating high-concurrency client management, enterprise authentication, and data persistence from heavy algorithmic graph processing and AI inference.

```
┌─────────────────────────────────────────────────────────────┐
│                 REACT FRONTEND (Vite)                       │
│    Port 5173  |  React 19  |  React Flow  |  Tailwind v4    │
│    Forensic Light Design  |  Auth Context  |  History Drawer│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST (JWT Bearer Auth)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 NODE.JS / EXPRESS GATEWAY                   │
│    Port 5000  |  MERN Layer  |  MongoDB Atlas via Mongoose  │
│    JWT Auth Middleware  |  User Scoping  |  Multer Streams │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal HTTP (Port 8000)
                               │ (Server-to-Server / Private)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               PYTHON AI MICROSERVICE                        │
│    Port 8000  |  FastAPI + Uvicorn  |  LangGraph 6-Node     │
│    NetworkX Engine  |  Companies House API  |  OFAC SQLite │
│    3-Tier Multimodal Vision (Gemini -> NVIDIA -> OpenRouter)│
└─────────────────────────────────────────────────────────────┘
```

### Architectural Principles & Guardrails
* **Strict Security Boundary**: The browser **never** talks directly to the Python AI service. The Express gateway acts as the sole authenticated public interface.
* **Separation of Concerns**: Node.js handles fast I/O, user authentication, sessions, and database persistence. Python handles asynchronous graph traversal, deterministic graph math, and LLM vision extraction.
* **Deterministic Math Over LLM Hallucinations**: LLMs are never used to calculate risk scores or judge ownership percentages. All risk metrics, cycle detections, and director density calculations are executed by NetworkX graph algorithms.

---

## 4. Detailed Component Breakdown

### 4.1 Frontend Layer (`frontend/`)
* **Framework**: React 19 + Vite + Tailwind CSS v4.
* **Graph Visualization Engine**: `@xyflow/react` (React Flow) combined with `dagre` for automated hierarchical directed acyclic graph (DAG) layout positioning.
* **Design System**: **UNSHELL Forensic Light Mode System**
  * Palette Tokens:
    * `--alabaster-grey: #eaeaea;` (Soft off-white / light canvas tone)
    * `--periwinkle: #cbc5ea;` (Highlight pills, live status pulses, radar glow)
    * `--vintage-lavender: #73628a;` (Reticle corner pins, secondary borders, badges)
    * `--twilight-indigo: #313d5a;` (Primary action buttons, section headers, target entity tags)
    * `--jet-black: #183642;` (Deep charcoal slate typography for maximum readability)
  * Visual Signatures: 6px corner reticle pins (`.has-pin`), cyber-telemetry chips (`.telemetry-tag`), active radar scanner with rotating conic gradients and animated blip pings, interactive entity filters.
* **Key Components**:
  * `DualEntryGateway.jsx`: Dual-mode input allowing analysts to toggle between live Companies House CRN search and drag-and-drop corporate PDF document upload.
  * `LoadingScreen.jsx`: Real-time radar sweep and animated checklist showing live pipeline node execution stages (`[DONE]`, `[RUN]`, `[WAIT]`).
  * `InvestigationView.jsx`: Top status bar with target entity metadata, export action buttons, and integrated layout container.
  * `GraphCanvas.jsx`: Dynamic node/edge canvas with zoom controls, custom smoothstep edges with ownership percentages, and an ontology legend.
  * `CustomNode.jsx`: Domain-specific graph node cards (Target Company, Corporate PSC, Individual Director, Confirmed UBO, Offshore Vehicle, OFAC Hit).
  * `HistoryPanel.jsx`: Slide-out case archive displaying past investigations scoped to the signed-in investigator, supporting instant re-loading and deletion.
  * `AuthModal.jsx`: Investigator login/registration modal with one-tap demo login (`Special Agent Wen`).
  * `AuthContext.jsx`: Global authentication provider maintaining JWT bearer tokens in `localStorage` with auto-verification against `/api/auth/me`.

---

### 4.2 Backend API Gateway (`backend/`)
* **Runtime**: Node.js v24+ with Express 4 (ES Modules).
* **Database**: MongoDB Atlas via Mongoose ODM.
* **Security & Auth**:
  * Passwords hashed using `bcryptjs` with salt rounds = 10 (`pre('save')` hook).
  * Stateless session tokens via `jsonwebtoken` (JWT) with 30-day expiry.
  * `protect` middleware ensures only authorized users can access `/api/history`.
  * `optionalProtect` middleware attaches `req.user` if signed in so investigations are saved to the user's account without blocking anonymous/guest runs.
* **In-Memory Streaming**:
  * Uses `multer` with memory storage (`storage: multer.memoryStorage()`) and a 50MB file size cap.
  * Files are buffered in memory and piped directly via `axios` and `form-data` to the Python microservice. No temporary PDF files touch the backend server disk.
* **API Endpoints**:
  * `POST /api/auth/register`: Create user account.
  * `POST /api/auth/login`: Authenticate and return JWT token.
  * `GET /api/auth/me`: Retrieve investigator profile.
  * `POST /api/investigate`: Trigger CRN investigation.
  * `POST /api/investigate/document`: Trigger PDF upload investigation.
  * `POST /api/approve/:threadId`: Human-in-the-loop (HITL) approval endpoint.
  * `GET /api/history`: Paginated list of past investigations for the logged-in user.
  * `GET /api/history/:id`: Fetch complete stored graph payload by ID.
  * `DELETE /api/history/:id`: Delete a saved investigation belonging to the current user.
  * `GET /api/health`: Health status and AI microservice URL check.

---

### 4.3 Python AI & Forensics Microservice (`ai-service/`)
* **Framework**: FastAPI + Uvicorn + Python 3.11+.
* **Core Responsibilities**:
  1. UK Companies House REST API client with recursive expansion.
  2. 6-Node LangGraph stateful orchestration pipeline.
  3. NetworkX topological analysis, simple cycle detection, and risk scoring.
  4. Local OFAC SDN fuzzy screening via RapidFuzz.
  5. 3-Tier Multimodal Vision extraction for unstructured PDF filings.

---

## 5. The 6-Node LangGraph Pipeline

The investigation runs as a state machine governed by LangGraph (`agent/orchestrator.py`):

```
input_router
    │
    ▼
fetch_uk_api
    │
    ▼
depth_expand
    │
    ▼
cleanup_graph
    │
    ▼
calculate_risk
    │
    ▼
sanctions_check
    │
    ▼
compile_output
```

### Pipeline Node Roles:
1. **`input_router`**:
   * Initializes the `InvestigationState` TypedDict.
   * Assigns a unique session/thread identifier and validates the incoming CRN regex (`^([A-Z]{2}\d{6}|\d{8})$`).
2. **`fetch_uk_api`** (`ai/fetch_ch.py`):
   * Queries the official UK Companies House API using HTTP Basic Authentication:
     * `/company/{crn}`: Registered office address, incorporation date, company status, SIC codes.
     * `/company/{crn}/persons-with-significant-control`: PSC names, shareholding percentage bands, voting rights.
     * `/company/{crn}/officers`: Directors, secretaries, appointment dates, nationality, date of birth.
     * `/company/{crn}/filing-history`: Confirmation statements, annual accounts, insolvency notices.
     * `/company/{crn}/charges`: Outstanding mortgages or debentures.
   * Converts CH natural language ownership slugs (e.g. `ownership-of-shares-25-to-50-percent`) to mathematical midpoints (`37.5%`).
3. **`depth_expand`**:
   * Evaluates corporate PSCs (holding companies owning >25% of the target).
   * Automatically executes a recursive Level-2 traversal by looking up the corporate PSC's own registration number in Companies House.
   * Unmasks offshore intermediate parents and multi-layered holding webs.
4. **`cleanup_graph`**:
   * Strips disconnected nodes and handles orphaned entity edge mapping.
   * Resolves the primary Ultimate Beneficial Owner (UBO) by finding individual persons with the highest direct/indirect control.
5. **`calculate_risk`** (`graph/engine.py`):
   * Converts nodes and edges into a `networkx.DiGraph` (directed graph).
   * Runs graph theory algorithms to evaluate topological anomalies.
6. **`sanctions_check`**:
   * Normalizes all entity and director names (stripping punctuation, legal suffixes like "LTD", "PLC", "INC").
   * Runs fuzzy token-sort screening against the local US Treasury OFAC Specially Designated Nationals (SDN) database.
7. **`compile_output`**:
   * Serializes the graph into a React Flow-compatible payload `{ nodes: [...], edges: [...] }`.
   * Bundles the overall composite risk score (0-100), fatal flags, and audit evidence snippets.

---

## 6. The Forensic Risk Engine (Graph Theory & Scoring)

Risk scoring is **100% deterministic and mathematical**. Zero probabilistic guessing.

### Risk Vectors & Formulas

| Risk Flag | Detection Logic | Score Penalty | Regulatory Justification |
| :--- | :--- | :---: | :--- |
| **`CIRCULAR_LOOP`** | `networkx.simple_cycles(G)` detects a cycle where A $\rightarrow$ B $\rightarrow$ C $\rightarrow$ A. | **+100 (FATAL)** | Circular ownership has no legitimate commercial purpose; used almost exclusively to bypass beneficial ownership disclosure thresholds. |
| **`NOMINEE_PUPPET`** | Director's appointment count across Companies House exceeds 100 entities. | **+75 (FATAL)** | High-volume "straw directors" appointed by formation agents to conceal true controllers. |
| **`OFAC_MATCH`** | `RapidFuzz` token-sort ratio $\ge 90$ against US Treasury SDN list. | **Override to 100** | Strict liability legal violation; transactions must be frozen immediately. |
| **`OFFSHORE_WALL`** | PSC jurisdiction is outside the UK/EEA in a secrecy haven (BVI, Panama, Cayman Islands, Seychelles, Cyprus, etc.). | **+30** | Obstruction of ownership transparency; opaque corporate registers. |
| **`AGED_SHELL`** | Company incorporated $> 10$ years ago with $< 5$ historical filings. | **+15** | Dormant shelf companies purchased off-the-shelf to appear established and bypass new-business KYC scrutiny. |
| **`VAGUE_SIC`** | High-risk SIC codes (e.g., `74990` Non-trading company, `99999` Dormant). | **+10** | Frequently utilized for non-operational transactional pass-through vehicles. |

### Scoring Scale:
* **0 – 29**: **Low Risk (Auto-Approve)** — Transparent ownership, UK individuals, clean filing history.
* **30 – 64**: **Medium Risk (Human Review)** — Complex multi-tier holding structure or minor offshore exposure.
* **65 – 94**: **High Risk (Auto-Reject)** — Extreme director density, suspicious dormant shelf characteristics.
* **95 – 100**: **Critical Risk (SAR Filing Required)** — Circular ownership cycle detected or OFAC sanctions match.

---

## 7. Multimodal PDF Ingestion & Zero-Trust AI Extraction

When registry APIs lack structured ownership data (or when dealing with corporate deeds, trust agreements, or foreign filings), Unshell accepts PDF uploads via a **3-tier visual extraction pipeline** (`ai/gemini_extractor.py`):

1. **PDF Rendering**: Converts incoming PDF pages into high-resolution images (`PyMuPDF` / `fitz`) to preserve tabular matrices, signature blocks, and corporate organizational charts.
2. **Tier 1 (Primary)**: **Google Gemini 3.5 / Flash Multimodal** (`gemini-3.5-flash`). Analyzes the images directly using native visual reasoning, extracting entities, shareholdings, and document evidence citations.
3. **Tier 2 (Fallback)**: **NVIDIA NIM** (`google/gemma-4-31b-it`). Activated if Gemini experiences rate-limiting or service outages.
4. **Tier 3 (Emergency Fallback)**: **OpenRouter API** (`anthropic/claude-3.5-haiku`).
5. **Zero-Trust AI Verification**:
   * Raw LLM outputs are never trusted unconditionally.
   * Extracted entity names and numbers are validated through a token-sort comparison firewall against raw document text.
   * Edges extracted from PDFs are flagged with a `PDF_VERIFIED` tag and lower trust score until verified against registry records.

---

## 8. Database Schemas (MongoDB Atlas)

### User Schema (`backend/models/User.js`)
```javascript
{
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, select: false }, // bcrypt hashed
  role:      { type: String, default: 'Forensic Investigator' },
  createdAt: { type: Date, default: Date.now }
}
```

### Investigation Schema (`backend/models/Investigation.js`)
```javascript
{
  crn:         { type: String, required: true },
  companyName: { type: String, default: null },
  riskScore:   { type: Number, default: null }, // 0 - 100
  riskLabel:   { type: String, default: null }, // LOW, MEDIUM, HIGH, CRITICAL
  resolvedUbo: { type: String, default: null },
  graph:       { type: Object, default: null }, // { nodes: [...], edges: [...] }
  fatalFlags:  { type: [String], default: [] },
  stats:       { type: Object, default: null },
  source:      { type: String, enum: ['api', 'document'], default: 'api' },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  userEmail:   { type: String, default: null },
  createdAt:   { type: Date, default: Date.now }
}
```

---

## 9. Key Engineering Challenges & Solutions

### 1. Windows Character Encoding (`charmap` Codec Crash)
* **Problem**: In Windows terminals, standard Python stdout defaults to `cp1252` encoding. When AI models returned unicode symbols or emojis (e.g., 🏓, 🏢, 👑), Python threw `UnicodeEncodeError: 'charmap' codec can't encode character`.
* **Solution**: Standardized `PYTHONUTF8=1` in environment configuration and wrapped output streams with explicit UTF-8 encoding.

### 2. Event-Loop Starvation & Sync/Async Bridging in FastAPI
* **Problem**: Companies House HTTP calls and NetworkX graph cycle detection are CPU- and network-bound synchronous operations. Running them directly inside async FastAPI routes blocked the asyncio event loop, causing client request timeouts under concurrent load.
* **Solution**: Offloaded synchronous pipeline execution using `asyncio.to_thread(orchestrator.run_investigation, crn)` with a strict 120-second timeout circuit breaker.

### 3. Model Version Deprecation & Fallback Handling
* **Problem**: Hardcoded model strings (e.g. `gemini-2.5-flash`) became deprecated and returned HTTP 404 from Google AI Studio.
* **Solution**: Implemented dynamic model fallback routines in `gemini_normalizer.py` that gracefully cycle from `gemini-3.5-flash` down to `gemini-flash-latest` and NVIDIA NIM endpoints.

### 4. Zero Memory File Buffering
* **Problem**: Writing uploaded PDF documents to disk creates security risks (data leaks, GDPR compliance issues, container storage bloat).
* **Solution**: Configured Express `multer.memoryStorage()`. The PDF buffer is streamed straight into an HTTP `multipart/form-data` payload and forwarded to Python, ensuring zero unencrypted disk footprint.

---

## 10. Sample High-Yield Interview Questions & Answers

### Q1: "Why did you separate the backend into Node.js Express and Python FastAPI instead of doing everything in Python?"
> **Answer**: 
> "It's about choosing the right tool for each layer of the architecture. 
> Node.js and Express excel at high-throughput I/O, serving REST APIs, managing JWT authentication, streaming file uploads, and interfacing with MongoDB via Mongoose. 
> Python, on the other hand, is the undisputed standard for data science, graph algorithms, and AI orchestrations. 
> By isolating Python behind Express, the browser never has direct access to our AI microservice, establishing an enterprise security boundary. It also allows us to independently scale the API gateway from the compute-heavy NetworkX graph analysis and LangGraph state machines."

### Q2: "Why use NetworkX for AML risk scoring rather than letting a Large Language Model evaluate the risk?"
> **Answer**: 
> "Regulatory compliance requires determinism, auditability, and mathematical proof. 
> If an investigator freezes an account or files a Suspicious Activity Report (SAR), they cannot justify it by saying 'the AI felt it looked risky'. LLMs are prone to hallucinations, non-deterministic scoring, and prompt injections. 
> In Unshell, we use Tarjan’s cycle detection algorithm via NetworkX (`nx.simple_cycles`) to mathematically prove the presence of circular ownership loops, and calculate degree centrality for nominee director density. We only use AI where unstructured perception is genuinely required — extracting visual layouts from PDF incorporation deeds — and even then, we pass the extracted output through a zero-trust verification firewall."

### Q3: "How does your circular loop detection work, and why is it fatal in AML?"
> **Answer**: 
> "In AML compliance, a beneficial owner is legally defined as any person owning or controlling $>25\%$ of shares or voting rights. 
> To evade this, entities construct circular control structures: Company A owns 40% of B, B owns 40% of C, and C owns 40% of A. On paper, no single natural person holds more than 25%. 
> We model corporate PSC relationships as a directed graph where entities are nodes and control percentages are weighted edges. We run `networkx.simple_cycles(G)`. Any detected directed cycle immediately triggers the `CIRCULAR_LOOP` fatal flag (+100 score penalty), which flags the entity for mandatory SAR filing."

### Q4: "How do you handle rate-limiting and resilience when querying external APIs like UK Companies House and Gemini?"
> **Answer**: 
> "For Companies House, we use a custom HTTP client with connection pooling, exponential backoff, and a depth-2 expansion cap to prevent combinatorial explosions when expanding massive corporate conglomerates. 
> For our AI vision pipeline, we built a 3-tier fallback architecture: primary calls target Google Gemini Flash; if a 429 rate limit or 5xx outage occurs, execution falls back immediately to NVIDIA NIM (Gemma-4-31b-it), and finally to OpenRouter (Claude 3.5 Haiku). This guarantees that document ingestion never fails during critical investigations."

### Q5: "How does user data isolation and security work in your database?"
> **Answer**: 
> "We implement strict multi-tenant isolation at the application layer. When an investigator signs in, the Express server verifies their password with `bcryptjs` and issues a signed JWT containing their `userId`. 
> All investigation requests passing through `/api/investigate` tag the resulting MongoDB record with the authenticated `userId`. 
> When querying history via `GET /api/history` or deleting via `DELETE /api/history/:id`, the queries enforce `{ _id: id, userId: req.user._id }`. Even if an investigator guesses a valid MongoDB ObjectId, they cannot view or delete another investigator's forensic case files."

---

## 11. Quick Reference Cheat-Sheet

* **Frontend**: Port `5173` | React 19, Vite, React Flow, Dagre, Tailwind v4
* **Backend**: Port `5000` | Express, Mongoose, JWT, Multer, Axios
* **AI Service**: Port `8000` | FastAPI, LangGraph, NetworkX, RapidFuzz, SQLite OFAC
* **Primary DB**: MongoDB Atlas (`User`, `Investigation` collections)
* **Sanctions DB**: Local SQLite database populated from US Treasury OFAC SDN list
* **Test CRNs**:
  * `09446231` (Monzo Bank — Clean / Low Risk)
  * `06026625` (Seabon Ltd — Offshore / High Risk Dead End)
  * `12871051` (Revolut Bank UK — Complex Multi-layer Structure)
