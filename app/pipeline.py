"""Orchestrator: seed-default prospecting run.

Flow (matches the Build-path decision — deterministic tools run between agents):
  load buyers (seed: data/prospects.json, 0 Apollo | live: Research agent)
    -> filter_prospects  (do-not-contact + one-per-account)
    -> [optional] Tavily signals (free)
    -> score_prospect + rank
    -> gate (set aside clear non-fits; keep top N)
    -> Outreach agent (Gong Outreach Scribe)
    -> verify_citations
    -> assembled result + tool-event log
"""
from __future__ import annotations

import json
import sys
import time
from datetime import date
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools import filter_prospects as fp       # noqa: E402
from tools import score_prospect as sp          # noqa: E402
from tools import verify_citations as vc        # noqa: E402

from . import config, lyzr, tavily_signals      # noqa: E402


class Events:
    """Collects a tool-usage timeline for the UI."""

    def __init__(self):
        self.items: list[dict] = []

    def add(self, tool: str, title: str, status: str = "ok",
            detail: str = "", count=None, ms: int | None = None):
        self.items.append({
            "tool": tool, "title": title, "status": status,
            "detail": detail, "count": count, "ms": ms,
        })


def _load_seed() -> list[dict]:
    data = json.loads(config.SEED_FILE.read_text())
    return data.get("buyers", data) if isinstance(data, dict) else data


def _apply_brief_filters(prospects: list[dict], brief: dict) -> list[dict]:
    """Light brief filtering on top of the ICP that the seed data already satisfies."""
    emp_min = brief.get("employees_min")
    emp_max = brief.get("employees_max")
    out = []
    for p in prospects:
        emp = (p.get("account") or {}).get("employees")
        if isinstance(emp, int):
            if emp_min and emp < emp_min:
                continue
            if emp_max and emp > emp_max:
                continue
        out.append(p)
    return out


def run_pipeline(brief: dict, mode: str = "seed",
                 signals_mode: str = "off") -> dict:
    """Run one prospecting job. Returns a UI-ready result dict."""
    ev = Events()
    today = date.today()
    count = max(1, min(int(brief.get("count") or 5), 8))

    # 1. source buyers -------------------------------------------------------
    t = time.time()
    if mode == "live":
        if not config.LYZR_LIVE:
            raise RuntimeError(
                "live mode requires LYZR_LIVE=1 in .env (Research agent uses Apollo)")
        research = lyzr.research_chat(brief)
        buyers = research.get("prospects", [])
        ev.add("apollo", "Research agent (Apollo + Tavily)", detail="live mode",
               count=len(buyers), ms=int((time.time() - t) * 1000))
    else:
        buyers = _load_seed()
        ev.add("seed", "Loaded seed buyers", detail="data/prospects.json · 0 Apollo",
               count=len(buyers), ms=int((time.time() - t) * 1000))

    buyers = _apply_brief_filters(buyers, brief)

    # 2. filter_prospects (do-not-contact + one-per-account) -----------------
    t = time.time()
    names, domains = fp.load_dnc_file(config.DNC_FILE)
    kept = fp.filter_pre_enrichment(buyers, names)
    kept = fp.filter_post_enrichment(kept, domains)
    dropped = len(buyers) - len(kept)
    ev.add("filter", "filter_prospects", detail=f"{dropped} dropped (DNC / dupes)",
           count=len(kept), ms=int((time.time() - t) * 1000))

    # 3. optional free signal enrichment -------------------------------------
    if signals_mode == "tavily":
        t = time.time()
        enriched = 0
        for p in kept:
            if p.get("signals"):
                continue
            acc = p.get("account") or {}
            sig = tavily_signals.signals_for(acc.get("name") or "",
                                             acc.get("domain") or "", today)
            if sig:
                p["signals"] = sig
                enriched += 1
        ev.add("tavily", "Tavily signal search", detail=f"{enriched} with signals",
               count=enriched, ms=int((time.time() - t) * 1000))

    # 4. score + rank --------------------------------------------------------
    t = time.time()
    scored = sp.score_prospects(kept, today)
    ranked = sp.rank_prospects(scored, today)
    ev.add("score", "score_prospect + rank", detail="PRD §10 deterministic",
           count=len(ranked), ms=int((time.time() - t) * 1000))

    # 5. gate: set aside clear non-fits; keep top N --------------------------
    min_total = int(brief.get("min_total") or 0)
    contacted, set_aside = [], []
    for p in ranked:
        s = p["score"]
        if s["account_fit"] <= 0 or s["persona_fit"] <= 0:
            set_aside.append({**p, "reason": "out of ICP (industry/size/region or role)"})
        elif s["total"] < min_total:
            set_aside.append({**p, "reason": f"score {s['total']} below gate {min_total}"})
        else:
            contacted.append(p)
    contacted = contacted[:count]
    ev.add("gate", "Shortlist gate",
           detail=f"{len(contacted)} to contact · {len(set_aside)} set aside",
           count=len(contacted))

    # 6. Outreach agent ------------------------------------------------------
    drafts_by_id: dict[str, dict] = {}
    if contacted:
        t = time.time()
        payload = {"buyers": [
            {"account": p.get("account"), "buyer": p.get("buyer"),
             "signals": p.get("signals") or [], "flags": p.get("flags") or []}
            for p in contacted
        ]}
        status = "ok"
        try:
            out = lyzr.outreach_chat(payload)
            for d in out.get("drafts", []):
                drafts_by_id[d.get("apollo_id")] = d
        except lyzr.LyzrError as e:
            status = "error"
            ev.add("outreach", "Gong Outreach Scribe", status="error",
                   detail=str(e)[:160], ms=int((time.time() - t) * 1000))
        if status == "ok":
            ev.add("outreach", "Gong Outreach Scribe",
                   detail=f"{len(drafts_by_id)} drafts (KB-grounded)",
                   count=len(drafts_by_id), ms=int((time.time() - t) * 1000))

    # 7. verify_citations ----------------------------------------------------
    t = time.time()
    research_by_id = {(p.get("buyer") or {}).get("apollo_id"): p for p in contacted}
    verified_by_id = {}
    flagged = 0
    for aid, draft in drafts_by_id.items():
        res = vc.verify_draft(draft, research_by_id.get(aid, {}))
        verified_by_id[aid] = res
        if res["status"] != "passed":
            flagged += 1
    ev.add("verify", "verify_citations",
           detail=f"{len(drafts_by_id) - flagged} passed · {flagged} needs review",
           count=len(drafts_by_id), ms=int((time.time() - t) * 1000))

    # 8. assemble ------------------------------------------------------------
    prospects_out = [
        _assemble(p, drafts_by_id.get((p.get("buyer") or {}).get("apollo_id")),
                  verified_by_id.get((p.get("buyer") or {}).get("apollo_id")))
        for p in contacted
    ]
    set_aside_out = [{
        "name": (p.get("buyer") or {}).get("name"),
        "title": (p.get("buyer") or {}).get("title"),
        "company": (p.get("account") or {}).get("name"),
        "domain": (p.get("account") or {}).get("domain"),
        "total": p["score"]["total"],
        "reason": p["reason"],
    } for p in set_aside]

    return {
        "mode": mode,
        "requested_count": count,
        "returned_count": len(prospects_out),
        "prospects": prospects_out,
        "set_aside": set_aside_out,
        "events": ev.items,
        "metrics": {
            "sourced": len(buyers),
            "after_filter": len(kept),
            "contacted": len(prospects_out),
            "set_aside": len(set_aside_out),
            "flagged": flagged,
            "apollo_credits": 0 if mode == "seed" else None,
        },
    }


def _assemble(p: dict, draft: dict | None, verify: dict | None) -> dict:
    acc, buyer, score = p.get("account") or {}, p.get("buyer") or {}, p["score"]
    draft = draft or {}
    email = draft.get("email") or {}
    return {
        "apollo_id": buyer.get("apollo_id"),
        "name": buyer.get("name"),
        "title": buyer.get("title"),
        "company": acc.get("name"),
        "domain": acc.get("domain"),
        "industry": acc.get("industry"),
        "employees": acc.get("employees"),
        "region": acc.get("region"),
        "email": buyer.get("email"),
        "email_status": buyer.get("email_status"),
        "months_in_role": buyer.get("months_in_role"),
        "linkedin_url": buyer.get("linkedin_url"),
        "score": score,
        "signals": p.get("signals") or [],
        "draft": {
            "subject": email.get("subject", ""),
            "body": email.get("body", ""),
            "status": email.get("status", "no-draft" if not draft else "ok"),
            "linkedin_note": draft.get("linkedin_note", ""),
            "cited_signal_ids": draft.get("cited_signal_ids", []),
            "cited_prop_id": draft.get("cited_prop_id"),
        },
        "verify": verify or {"status": "no-draft", "review_reasons": []},
    }
