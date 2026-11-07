import os
import re
import asyncio
import traceback
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# Load .env BEFORE importing internal modules that read os.environ
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from agent.orchestrator import run_investigation, run_investigation_document

app = FastAPI(
    title="Unshell AI Microservice",
    version="2.0",
    description="Internal LangGraph + RAG pipeline. Exposed only to the Express backend.",
    docs_url="/docs",
)


class InvestigateAPIRequest(BaseModel):
    crn: str
    mode: Optional[str] = "api"


def normalize_crn(raw_crn: str) -> str:
    cleaned = re.sub(r"[\s\-]+", "", (raw_crn or "")).upper()
    if cleaned.isdigit() and 1 <= len(cleaned) <= 7:
        cleaned = cleaned.zfill(8)
    return cleaned


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "fusion-backend",
        "version": "2.0",
    }


# ── Route 1: CRN → Companies House API path ──────────────────────────────────
@app.post("/investigate")
async def investigate(request: InvestigateAPIRequest):
    clean_crn = normalize_crn(request.crn)
    if not clean_crn:
        raise HTTPException(status_code=422, detail="CRN cannot be empty.")
    try:
        # run_investigation is synchronous (LangGraph) — run in thread pool
        result = await asyncio.wait_for(
            asyncio.to_thread(run_investigation, clean_crn),
            timeout=120.0,
        )
        return result
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail={"error": "Investigation timed out after 120s", "type": "TimeoutError"},
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"Error in investigation: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "type": type(e).__name__},
        )


# ── Route 2: PDF upload → Document extraction path ───────────────────────────
@app.post("/investigate/document")
async def investigate_document(file: UploadFile = File(...)):
    try:
        print(f"\n[DOCUMENT] Received PDF: {file.filename}\n")
        pdf_bytes = await file.read()
        result = run_investigation_document(
            pdf_bytes=pdf_bytes,
            filename=file.filename or "document.pdf",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        print(f"Error in document investigation: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail={"error": str(e), "type": type(e).__name__},
        )


# ── Route 3: HITL resume (PDF upload for offshore dead-end) ──────────────────
@app.post("/approve/{thread_id}")
async def approve(thread_id: str, file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        result = run_investigation_document(
            pdf_bytes=pdf_bytes,
            filename=file.filename or f"hitl_{thread_id}.pdf",
        )
        result["thread_id"] = thread_id
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__},
    )
