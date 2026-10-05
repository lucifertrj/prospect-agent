"""Runtime config, loaded from .env. Secrets never leave this process."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / ".env")


def _get(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


# Lyzr Studio
LYZR_API_KEY = _get("LYZR_API_KEY")
LYZR_USER_ID = _get("LYZR_USER_ID")
LYZR_BASE_URL = _get("LYZR_BASE_URL", "https://agent-prod.studio.lyzr.ai/v3")
LYZR_RAG_BASE_URL = _get("LYZR_RAG_BASE_URL", "https://rag-prod.studio.lyzr.ai/v3")

MANAGER_AGENT_ID = _get("LYZR_MANAGER_AGENT_ID")
RESEARCH_AGENT_ID = _get("LYZR_RESEARCH_AGENT_ID")
OUTREACH_AGENT_ID = _get("LYZR_OUTREACH_AGENT_ID")
KB_ID = _get("LYZR_KB_ID")

# Direct tool keys (LIVE only)
TAVILY_API_KEY = _get("TAVILY_API_KEY")
APOLLO_API_KEY = _get("APOLLO_API_KEY")

# Safety switch. Apollo / the Research agent are reachable only when this is "1".
LYZR_LIVE = _get("LYZR_LIVE", "0") == "1"

# Supabase / Evidence Cache
SUPABASE_URL = _get("SUPABASE_URL")
SUPABASE_KEY = _get("SUPABASE_KEY")
CACHE_ENABLED = _get("CACHE_ENABLED", "1") == "1"
CACHE_TTL_DAYS = int(_get("CACHE_TTL_DAYS", "7") or "7")


# Data
SEED_FILE = REPO_ROOT / "data" / "prospects.json"
DNC_FILE = REPO_ROOT / "kb" / "do_not_contact.md"


def masked_key() -> str:
    """Safe-to-log fingerprint of the API key (never the key itself)."""
    k = LYZR_API_KEY
    return f"{k[:11]}…{k[-4:]}" if len(k) > 16 else "unset"
