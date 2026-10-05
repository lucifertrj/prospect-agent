"""score_prospect: deterministic lead scoring (PRD §10).

Research objects in, score fields out. Pure functions, no network, no randomness:
the same input always yields the same output (acceptance #8).

Self-contained on purpose: this file is pasted into Lyzr Studio as a custom tool
(step 3.4), where kb/*.md is NOT on disk. The constants below mirror kb/icp.md;
if the ICP changes, change both. classify_region() is duplicated in
verify_citations.py byte-for-byte; a test asserts they agree.
"""
from __future__ import annotations

import re
from datetime import date

# --- ICP constants (mirror kb/icp.md) ----------------------------------------

# Matched as substrings against Apollo's industry label (case-insensitive).
# Apollo tags in-ICP software companies "information technology & services"
# (the only tech label in data/prospects.json), caught by "information technology".
# Out-of-ICP labels the keyword search also surfaces (financial services, human
# resources, management consulting, staffing & recruiting) match nothing and score 0.
TARGET_INDUSTRY_SUBSTRINGS = ("software", "technology", "saas",
                              "information technology", "internet")
EMP_MIN, EMP_MAX = 200, 2000
SIGNAL_MAX_AGE_DAYS = 180  # §12: older signals are discarded

_US = {"united states", "usa", "us", "u.s.", "u.s.a."}
_UK = {"united kingdom", "uk", "u.k.", "great britain", "england",
       "scotland", "wales", "northern ireland"}
_EU = {"austria", "belgium", "bulgaria", "croatia", "cyprus", "czechia",
       "czech republic", "denmark", "estonia", "finland", "france", "germany",
       "greece", "hungary", "ireland", "italy", "latvia", "lithuania",
       "luxembourg", "malta", "netherlands", "the netherlands", "poland",
       "portugal", "romania", "slovakia", "slovenia", "spain", "sweden"}


def classify_region(region: str | None) -> str:
    """US / EU_UK / OTHER. Shared with verify_citations (opt-out trigger)."""
    r = (region or "").strip().lower()
    if r in _US:
        return "US"
    if r in _UK or r in _EU:
        return "EU_UK"
    return "OTHER"


# --- date helpers ------------------------------------------------------------

def _parse_date(s: str | None) -> date | None:
    if not s or not re.match(r"^\d{4}-\d{2}-\d{2}$", str(s)):
        return None
    try:
        y, m, d = map(int, s.split("-"))
        return date(y, m, d)
    except ValueError:
        return None


def _age_days(signal: dict, today: date) -> int | None:
    d = _parse_date(signal.get("date"))
    return None if d is None else (today - d).days


def valid_signals(signals: list[dict], today: date) -> list[dict]:
    """§12: a signal counts only if it has a date and is <= 180 days old."""
    out = []
    for s in signals or []:
        age = _age_days(s, today)
        if age is not None and age <= SIGNAL_MAX_AGE_DAYS:
            out.append(s)
    return out


# --- component scores (PRD §10) ----------------------------------------------

def account_fit(account: dict) -> int:
    pts = 0
    industry = (account.get("industry") or "").lower()
    if any(sub in industry for sub in TARGET_INDUSTRY_SUBSTRINGS):
        pts += 15
    emp = account.get("employees")
    if isinstance(emp, int) and EMP_MIN <= emp <= EMP_MAX:
        pts += 15
    if classify_region(account.get("region")) in ("US", "EU_UK"):
        pts += 10
    return pts


def persona_fit(buyer: dict) -> int:
    t = (buyer.get("title") or "").lower()
    if "chief revenue officer" in t or re.search(r"\bcro\b", t) \
            or (("vp" in t or "vice president" in t) and "sales" in t):
        return 20
    if "enablement" in t or "revenue operations" in t or "revops" in t:
        return 15
    if "director" in t and "sales" in t:
        return 8
    return 0


def intent(buyer: dict, vsignals: list[dict]) -> int:
    """Sales hiring 10, funding 10, buyer new in role (<=6 mo) 5.

    "New in role" uses Apollo months_in_role, not the new_leader signal, so a
    new_leader signal is not double-counted here (it still feeds timing/confidence).
    """
    pts = 0
    types = {s.get("type") for s in vsignals}
    if "sales_hiring" in types:
        pts += 10
    if "funding" in types:
        pts += 10
    mir = buyer.get("months_in_role")
    if isinstance(mir, int) and mir <= 6:
        pts += 5
    return pts


def timing(vsignals: list[dict], today: date) -> int:
    ages = [a for a in (_age_days(s, today) for s in vsignals) if a is not None]
    if not ages:
        return 0
    newest = min(ages)
    if newest <= 30:
        return 15
    if newest <= 90:
        return 8
    if newest <= 180:
        return 3
    return 0


def confidence(account: dict, vsignals: list[dict], flags: list[str],
               today: date) -> str:
    """Binary high/low. high = we have a real why-now and solid firmographics:
    at least one valid signal (already filtered to <=180 days) AND complete
    firmographics AND no contradiction. Otherwise low. (`today` is unused now;
    kept for a stable signature.)"""
    if any(str(f).startswith("contradiction") for f in flags or []):
        return "low"
    firmographics = all(account.get(k) is not None
                        for k in ("industry", "employees", "region"))
    if vsignals and firmographics:
        return "high"
    return "low"


def label_for_total(total: int) -> str:
    if total >= 80:
        return "Priority now"
    if total >= 65:
        return "Strong fit"
    return "Not now"


# --- public API --------------------------------------------------------------

def score_one(prospect: dict, today: date) -> dict:
    account = prospect.get("account") or {}
    buyer = prospect.get("buyer") or {}
    vsignals = valid_signals(prospect.get("signals") or [], today)
    flags = prospect.get("flags") or []

    af = account_fit(account)
    pf = persona_fit(buyer)
    it = intent(buyer, vsignals)
    tm = timing(vsignals, today)
    total = af + pf + it + tm
    return {
        "account_fit": af, "persona_fit": pf, "intent": it, "timing": tm,
        "total": total, "label": label_for_total(total),
        "confidence": confidence(account, vsignals, flags, today),
    }


def score_prospects(prospects: list[dict], today: date | None = None) -> list[dict]:
    """Score a batch in one call. Returns copies with a 'score' key added.

    `today` is computed once for the whole batch so all buyers age against one
    reference (determinism holds across a midnight boundary).
    """
    today = today or date.today()
    out = []
    for p in prospects:
        scored = dict(p)
        scored["score"] = score_one(p, today)
        out.append(scored)
    return out


_CONF_RANK = {"high": 1, "low": 0}


def rank_prospects(scored: list[dict], today: date | None = None) -> list[dict]:
    """Rank by total, then tie-break: higher confidence, newer signal,
    employee count closer to 500 (PRD §10)."""
    today = today or date.today()

    def newest_age(p):
        ages = [a for a in (_age_days(s, today)
                            for s in valid_signals(p.get("signals") or [], today))
                if a is not None]
        return min(ages) if ages else 10**9

    def emp_distance(p):
        emp = (p.get("account") or {}).get("employees")
        return abs(emp - 500) if isinstance(emp, int) else 10**9

    return sorted(
        scored,
        key=lambda p: (
            -p["score"]["total"],
            -_CONF_RANK.get(p["score"]["confidence"], 0),
            newest_age(p),
            emp_distance(p),
        ),
    )


if __name__ == "__main__":
    import json
    import sys
    data = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else []
    buyers = data.get("buyers", data) if isinstance(data, dict) else data
    for p in rank_prospects(score_prospects(buyers)):
        s = p["score"]
        b, a = p.get("buyer", {}), p.get("account", {})
        print(f'{s["total"]:3d} {s["label"]:<12} {s["confidence"]:<6} '
              f'{b.get("title")} @ {a.get("name")}')
