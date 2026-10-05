"""FastAPI backend: prospecting runs, KB retrieve, chat, static UI.

Run:  uvicorn app.server:app --reload --port 8000   (from the repo root)
"""
from __future__ import annotations

import re
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, lyzr, pipeline

STATIC = Path(__file__).resolve().parent / "static"
app = FastAPI(title="Gong Prospector")


# --- models -----------------------------------------------------------------

class Brief(BaseModel):
    industry: str | None = None
    region: str | None = None
    roles: str | None = None
    count: int | None = 5
    employees_min: int | None = None
    employees_max: int | None = None
    min_total: int | None = 0


class RunBody(BaseModel):
    brief: Brief = Brief()
    mode: str = "seed"
    signals_mode: str = "off"


class ChatBody(BaseModel):
    message: str


class KBBody(BaseModel):
    query: str
    top_k: int = 8


# --- endpoints --------------------------------------------------------------

@app.get("/api/config")
def get_config():
    return {
        "agents": {
            "manager": "Prospecting Orchestrator Manager",
            "research": "Prospect Research Agent",
            "outreach": "Gong Outreach Scribe",
        },
        "kb": "Gong Playbook",
        "live": config.LYZR_LIVE,
        "key": config.masked_key(),
        "user_id": config.LYZR_USER_ID,
    }


@app.post("/api/run")
def run(body: RunBody):
    try:
        result = pipeline.run_pipeline(
            body.brief.model_dump(), mode=body.mode, signals_mode=body.signals_mode)
        return result
    except Exception as e:  # surface a clean error to the UI
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/kb")
def kb(body: KBBody):
    try:
        return {"results": lyzr.rag_retrieve(body.query, body.top_k)}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


_RUN_INTENT = re.compile(
    r"\b(find|prospect|research|outreach|draft|email|cro|vp|revops|enablement|"
    r"director|sales|run|generate)\b", re.IGNORECASE)
_COUNT_RE = re.compile(r"\b(\d{1,2})\b")


@app.post("/api/chat")
def chat(body: ChatBody):
    msg = body.message.strip()
    if _RUN_INTENT.search(msg):
        m = _COUNT_RE.search(msg)
        count = max(1, min(int(m.group(1)), 8)) if m else 5
        region = "EU" if re.search(r"\beu|europe\b", msg, re.I) else (
            "UK" if re.search(r"\buk\b", msg, re.I) else "US")
        brief = {"count": count, "region": region, "roles": msg}
        try:
            result = pipeline.run_pipeline(brief, mode="seed")
            reply = (f"Ran a seed prospecting job (0 Apollo credits). "
                     f"{result['returned_count']} prospect(s) ready, "
                     f"{result['metrics']['set_aside']} set aside.")
            return {"reply": reply, "result": result}
        except Exception as e:
            return {"reply": f"Run failed: {e}", "result": None}
    return {
        "reply": ("Tell me who to prospect—I'll return a ranked shortlist with "
                  "verified signals and tailored outreach (max 8)."),
        "result": None,
    }


# --- frontend & static UI ----------------------------------------------------

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

app.mount("/static", StaticFiles(directory=STATIC), name="static")

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/")
    def index():
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str):
        if full_path.startswith("api") or full_path.startswith("static") or full_path.startswith("assets"):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        target = FRONTEND_DIST / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        return FileResponse(FRONTEND_DIST / "index.html")
else:
    @app.get("/")
    def index():
        return FileResponse(STATIC / "index.html")

