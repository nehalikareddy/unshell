# 🐍 AI Microservice — Unshell

Internal FastAPI + LangGraph service. **Never called by the browser directly** — only the Express backend talks to it.

## Responsibilities

- Run the 6-node LangGraph investigation pipeline
- Fetch company data from the UK Companies House API
- Perform depth-2 corporate PSC expansion
- Run NetworkX risk scoring (cycle detection, director density)
- Screen against OFAC SDN sanctions database

## Project Structure

```
ai-service/
├── main.py                   # FastAPI entry point (internal, no CORS)
├── agent/
│   ├── orchestrator.py       # LangGraph 6-node pipeline
│   └── state.py              # InvestigationState TypedDict
├── ai/
│   ├── fetch_ch.py           # Companies House API client
│   ├── ch_parser.py          # PSC/officer → graph node parser
│   └── gemini_extractor.py   # Gemini PDF extraction (document mode)
├── graph/
│   └── engine.py             # NetworkX risk scoring engine
├── data/
│   └── sanctions.db          # OFAC SDN SQLite (not committed — add manually)
├── requirements.txt
└── .env.example
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
COMPANIES_HOUSE_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
NVIDIA_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
```

## Running

```bash
pip install -r requirements.txt
py -m uvicorn main:app --port 8000
```

Service starts at **http://localhost:8000** (internal only — do not expose publicly)

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/investigate` | POST | `{ "crn": "09446231" }` — CRN pipeline |
| `/investigate/document` | POST | PDF upload — document pipeline |
| `/approve/{thread_id}` | POST | HITL resume (PDF upload) |

## LangGraph Pipeline Nodes

```
input_router → fetch_uk_api → depth_expand → cleanup_graph → calculate_risk → sanctions_check → compile_output
```

Each node is a discrete Python function. State is passed through a TypedDict (`InvestigationState`).
