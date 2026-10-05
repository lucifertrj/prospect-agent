"""Optional, free signal enrichment via Tavily (seed-mode helper only).

The production Research agent does this with an LLM; here we approximate: a news
search per company, kept to <=180 days, typed by keyword. Default OFF; failures
degrade to no-signal so a run never breaks on a flaky network.
"""
from __future__ import annotations

from datetime import date, datetime

import requests

from . import config

_TYPE_KEYWORDS = [
    ("funding", ("raises", "raised", "funding", "series ", "acquired", "acquisition",
                 "investment", "valuation")),
    ("sales_hiring", ("hiring", "hires", "sdr", "account executive", "sales team",
                      "gtm", "go-to-market")),
    ("new_leader", ("appoints", "names", "new cro", "new chief revenue",
                    "vp of sales", "joins as", "promoted to")),
]


def _type_of(text: str) -> str:
    low = (text or "").lower()
    for typ, kws in _TYPE_KEYWORDS:
        if any(k in low for k in kws):
            return typ
    return "company_news"


def _age_days(published: str, today: date) -> int | None:
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%a, %d %b %Y %H:%M:%S %Z"):
        try:
            d = datetime.strptime(published[:19] if "T" in published else published,
                                  fmt).date()
            return (today - d).days
        except (ValueError, TypeError):
            continue
    return None


def signals_for(company: str, domain: str, today: date | None = None,
                max_results: int = 3) -> list[dict]:
    today = today or date.today()
    if not config.TAVILY_API_KEY:
        return []
    try:
        resp = requests.post(
            "https://api.tavily.com/search",
            json={
                "api_key": config.TAVILY_API_KEY,
                "query": f"{company} funding OR hiring OR new CRO OR launch",
                "topic": "news",
                "days": 180,
                "max_results": max_results,
            },
            timeout=30,
        )
        if resp.status_code != 200:
            return []
        results = resp.json().get("results", [])
    except requests.RequestException:
        return []

    out: list[dict] = []
    for i, r in enumerate(results, 1):
        published = r.get("published_date") or ""
        age = _age_days(published, today)
        if age is None or age > 180 or age < 0:
            continue
        title = r.get("title") or ""
        if company.split()[0].lower() not in (title + (r.get("content") or "")).lower():
            continue
        out.append({
            "id": f"s{i}",
            "type": _type_of(f"{title} {r.get('content','')}"),
            "summary": title,
            "date": published[:10],
            "url": r.get("url") or "",
            "publisher": (r.get("url") or "").split("/")[2] if r.get("url") else "",
        })
    return out
