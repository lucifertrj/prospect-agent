"""Thin client for the Lyzr Studio inference + RAG APIs.

Only the Outreach agent is called on a seed run. The Research agent uses Apollo,
so calling it is gated behind config.LYZR_LIVE — see research_chat().
"""
from __future__ import annotations

import json
import re
import secrets

import requests

from . import config


class LyzrError(RuntimeError):
    pass


def _session_id(agent_id: str) -> str:
    return f"{agent_id}-{secrets.token_hex(5)}"


def _extract_json(text: str):
    """Agents with structured output return JSON, but the transport wraps it in a
    string and weaker models sometimes fence it. Parse defensively."""
    if not text:
        raise LyzrError("empty agent response")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    fenced = re.search(r"```(?:json)?\s*(.+?)```", text, re.DOTALL)
    if fenced:
        try:
            return json.loads(fenced.group(1))
        except json.JSONDecodeError:
            pass
    # last resort: first balanced-looking object/array
    m = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if m:
        return json.loads(m.group(1))
    raise LyzrError("could not parse JSON from agent response")


def chat(agent_id: str, message: str, timeout: int = 120) -> str:
    """Raw agent call. Returns the agent's response string."""
    if not config.LYZR_API_KEY or not config.LYZR_USER_ID:
        raise LyzrError("LYZR_API_KEY / LYZR_USER_ID missing from .env")
    url = f"{config.LYZR_BASE_URL}/inference/chat/"
    payload = {
        "user_id": config.LYZR_USER_ID,
        "agent_id": agent_id,
        "session_id": _session_id(agent_id),
        "message": message,
    }
    headers = {"Content-Type": "application/json", "x-api-key": config.LYZR_API_KEY}
    resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
    if resp.status_code != 200:
        raise LyzrError(f"inference {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    out = data.get("response", data) if isinstance(data, dict) else data
    return out if isinstance(out, str) else json.dumps(out)


def chat_json(agent_id: str, message: str, timeout: int = 120):
    """Agent call that returns parsed structured output."""
    return _extract_json(chat(agent_id, message, timeout=timeout))


def outreach_chat(payload: dict, timeout: int = 180) -> dict:
    """Send research evidence to the Gong Outreach Scribe; return {drafts: [...]}."""
    msg = json.dumps(payload, ensure_ascii=False)
    return chat_json(config.OUTREACH_AGENT_ID, msg, timeout=timeout)


def research_chat(brief: dict, timeout: int = 240) -> dict:
    """Call the Research agent (Apollo-backed). LIVE-only by design."""
    if not config.LYZR_LIVE:
        raise LyzrError(
            "Research agent is Apollo-backed and blocked in seed mode. "
            "Set LYZR_LIVE=1 in .env to run a live research call."
        )
    msg = json.dumps(brief, ensure_ascii=False)
    return chat_json(config.RESEARCH_AGENT_ID, msg, timeout=timeout)


def rag_retrieve(query: str, top_k: int = 8, timeout: int = 60) -> list[dict]:
    """Query the Gong Playbook KB. Used by the UI explorer, not the seed pipeline."""
    if not config.KB_ID:
        raise LyzrError("LYZR_KB_ID missing from .env")
    url = f"{config.LYZR_RAG_BASE_URL}/rag/{config.KB_ID}/retrieve/"
    params = {"query": query, "top_k": top_k, "retrieval_type": "mmr",
              "score_threshold": 0}
    headers = {"Content-Type": "application/json", "x-api-key": config.LYZR_API_KEY}
    resp = requests.get(url, params=params, headers=headers, timeout=timeout)
    if resp.status_code != 200:
        raise LyzrError(f"rag {resp.status_code}: {resp.text[:300]}")
    data = resp.json()
    if isinstance(data, dict):
        for key in ("results", "documents", "data", "retrieved"):
            if isinstance(data.get(key), list):
                return data[key]
    return data if isinstance(data, list) else [data]
