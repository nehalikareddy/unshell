import os
import traceback
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from agent.orchestrator import run_investigation, run_investigation_document

load_dotenv()

app = FastAPI(title="Project Fusion 2.0", version="2.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class InvestigateAPIRequest(BaseModel):
    crn: str
    mode: Optional[str] = "api"

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "fusion-backend",
        "version": "2.0"
    }

# ── Route 1: CRN → Companies House API path ──────────────────────────────────
@app.post("/investigate")
async def investigate(request: InvestigateAPIRequest):
    try:
        result = run_investigation(crn=request.crn)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"Error in investigation: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "type": type(e).__name__}
        )

# ── Route 2: PDF upload → Document extraction path ───────────────────────────
@app.post("/investigate/document")
async def investigate_document(file: UploadFile = File(...)):
    try:
        print(f"\n[DOCUMENT] Received PDF: {file.filename}\n")
        pdf_bytes = await file.read()
        result = run_investigation_document(
            pdf_bytes=pdf_bytes,
            filename=file.filename or "document.pdf"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"Error in document investigation: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "type": type(e).__name__}
        )

# ── Route 3: HITL resume (friend's PDF upload for offshore dead-end) ──────────
@app.post("/approve/{thread_id}")
async def approve(thread_id: str, file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        # TODO: wire into LangGraph resume when friend's HITL node is merged
        raise HTTPException(status_code=501, detail="HITL resume not yet merged")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__}
    )
