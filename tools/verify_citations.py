"""verify_citations: deterministic draft checks (PRD §2.2, §11).

Checks each outreach draft against its research object:
  - every cited signal ID exists in this account's signals
  - every number in the draft appears verbatim in a cited signal's summary;
    any other number is blocked
  - no blocked phrases (short phrases matched on word boundaries, so "roi" does
    not trip on "Detroit"; multi-word phrases matched as-is)
  - no competitor names (Competitors section of the do-not-contact list only)
  - cited_prop_id exists and matches the buyer's persona
  - signal IDs never appear in the body or note text (they go in cited_signal_ids)
  - email body <= 120 words (fixed sign-off excluded), LinkedIn note <= 200 chars

The fixed sign-off (name/title/postal address) is boilerplate, not a claim, so it
is stripped before the number/length scan — otherwise the office address trips the
number-grounding check. The opt-out line was removed from outreach (product
decision 2026-10-05), so it is no longer required; it is still stripped if present.

Self-contained for Studio paste (step 3.4): the constants mirror the KB, which
is the source of truth. Edit the KB and this file together. classify_region() is
duplicated from score_prospect.py byte-for-byte; a test asserts they agree.
"""
from __future__ import annotations

import re

EMAIL_MAX_WORDS = 120
LINKEDIN_MAX_CHARS = 300

# Mirror of blocked_claims.txt "Blocked phrases" (case-insensitive). Single tokens
# are matched on word boundaries; multi-word phrases are matched as a phrase.
BLOCKED_PHRASES = [
    "guarantee", "guaranteed", "risk-free", "no risk", "proven to",
    "best-in-class", "best in class", "industry-leading", "industry leading",
    "number one", "#1", "market leader", "roi", "return on investment",
    "increase revenue by", "boost revenue by", "close more deals by",
    "revolutionary", "game-changer", "game changer", "cutting-edge",
    "world-class",
]


def _phrase_regex(p: str) -> re.Pattern:
    # "#1" has no leading word char, so \b before it fails when it starts a token;
    # match "#1" not followed by another digit (so "#10" does not trip).
    if p == "#1":
        return re.compile(r"#1(?!\d)")
    return re.compile(rf"\b{re.escape(p)}\b")


_BLOCKED_RES = [(p, _phrase_regex(p)) for p in BLOCKED_PHRASES]

# Competitors only (do-not-contact "Competitors" section). The rest of that list
# is ~290 Gong *customers* and must NOT be treated as competitor names.
COMPETITOR_NAMES = ["zoominfo", "chorus", "clari", "salesloft", "outreach", "avoma"]

# Value props (mirror value_props.txt): the only claims a draft may make, and the
# persona each is valid for (mirror persona_pains.txt; Director of Sales -> VP Sales).
VALID_PROP_IDS = {"vp-forecast", "vp-visibility", "vp-ramp", "vp-coaching",
                  "vp-dataquality"}
PROP_BY_PERSONA = {
    "cro": {"vp-forecast"},
    "vp_sales": {"vp-ramp", "vp-visibility"},
    "enablement": {"vp-coaching"},
    "revops": {"vp-dataquality"},
}

# Opt-out line (removed from outreach 2026-10-05). Kept as a constant so it is
# still stripped from any legacy draft that includes it before the word/number scan.
OPT_OUT_LINE = 'You can opt out of these emails at any time by replying "unsubscribe".'

# First line of the fixed sign-off. Everything from here to the end of the body is
# boilerplate (name, title, postal address) and is excluded from the content scan.
SIGN_OFF_MARKER = "Tarun Jain"

_US = {"united states", "usa", "us", "u.s.", "u.s.a."}
_UK = {"united kingdom", "uk", "u.k.", "great britain", "england",
       "scotland", "wales", "northern ireland"}
_EU = {"austria", "belgium", "bulgaria", "croatia", "cyprus", "czechia",
       "czech republic", "denmark", "estonia", "finland", "france", "germany",
       "greece", "hungary", "ireland", "italy", "latvia", "lithuania",
       "luxembourg", "malta", "netherlands", "the netherlands", "poland",
       "portugal", "romania", "slovakia", "slovenia", "spain", "sweden"}


def classify_region(region: str | None) -> str:
    """US / EU_UK / OTHER. Shared byte-for-byte with score_prospect (region fit).

    Opt-out is now universal, so verify no longer branches on region; this is kept
    as the one canonical region classifier (drift-guarded against score_prospect).
    """
    r = (region or "").strip().lower()
    if r in _US:
        return "US"
    if r in _UK or r in _EU:
        return "EU_UK"
    return "OTHER"


def persona_of(title: str | None) -> str:
    """Buyer persona from title (mirror persona_pains.txt). Enablement and RevOps
    are checked before VP Sales so "VP of Sales Enablement" maps to the higher-tier
    pain; Director of Sales maps to the VP Sales row (it scores 8)."""
    t = (title or "").lower()
    if "chief revenue officer" in t or re.search(r"\bcro\b", t):
        return "cro"
    if "enablement" in t:
        return "enablement"
    if "revenue operations" in t or "revops" in t:
        return "revops"
    if ("vp" in t or "vice president" in t) and "sales" in t:
        return "vp_sales"
    if "director" in t and "sales" in t:
        return "vp_sales"
    return "unknown"


# Any run containing a digit: catches "32%", "2x", "$1M", "40", "5B".
_NUM_RE = re.compile(r"\$?\d[\w.,%]*")
# A bare signal id like s1, S2 (surrounded by word boundaries).
_SIGID_RE = re.compile(r"\bs\d+\b", re.IGNORECASE)


def _norm_num(tok: str) -> str:
    return tok.strip().lower().strip(".,")


def allowed_numbers(research: dict, cited_ids: list[str]) -> set[str]:
    """Numbers allowed in the draft: those appearing in cited signal summaries."""
    allowed: set[str] = set()
    by_id = {s.get("id"): s for s in (research.get("signals") or [])}
    for sid in cited_ids or []:
        s = by_id.get(sid)
        if s:
            for tok in _NUM_RE.findall(s.get("summary") or ""):
                allowed.add(_norm_num(tok))
    return allowed


def find_numbers(text: str, allowed: set[str]) -> list[str]:
    return [tok for tok in _NUM_RE.findall(text or "")
            if _norm_num(tok) and _norm_num(tok) not in allowed]


def _strip_optout(body: str) -> str:
    """Strip boilerplate before the content scan: the fixed sign-off (from the
    name line onward: title + postal address) and any legacy opt-out line.

    Named for history; it now removes the whole sign-off, not just the opt-out.
    """
    b = (body or "").replace(OPT_OUT_LINE, "")
    return re.split(rf"\n\s*{re.escape(SIGN_OFF_MARKER)}\b", b)[0]


def verify_draft(draft: dict, research: dict) -> dict:
    """Return {'status': 'passed'|'needs_review', 'review_reasons': [...]}."""
    reasons: list[str] = []
    buyer = research.get("buyer") or {}
    signal_ids = {s.get("id") for s in (research.get("signals") or [])}
    cited = draft.get("cited_signal_ids") or []

    email = draft.get("email") or {}
    subject = email.get("subject") or ""
    body = email.get("body") or ""
    note = draft.get("linkedin_note") or ""
    no_address = email.get("status") == "no-address" or not body.strip()

    # 1. cited signals belong to this account
    for sid in cited:
        if sid not in signal_ids:
            reasons.append(f"cited signal '{sid}' is not a signal of this account")

    # text to scan: email (if present) + LinkedIn note
    scan_parts = [note] + ([] if no_address else [subject, _strip_optout(body)])
    scan = "\n".join(scan_parts)
    low = scan.lower()

    # 2. numbers: only those verbatim in a cited signal's summary
    nums = find_numbers(scan, allowed_numbers(research, cited))
    if nums:
        reasons.append(
            f"numbers not found in a cited signal: {sorted(set(nums))}")

    # 3. blocked phrases (word boundaries for single tokens)
    hits = [p for p, rx in _BLOCKED_RES if rx.search(low)]
    if hits:
        reasons.append(f"blocked phrase(s): {hits}")

    # 4. competitor names
    comp = [c for c in COMPETITOR_NAMES if re.search(rf"\b{re.escape(c)}\b", low)]
    if comp:
        reasons.append(f"names competitor(s): {comp}")

    # 5. cited_prop_id exists and matches the buyer's persona
    pid = draft.get("cited_prop_id")
    persona = persona_of(buyer.get("title"))
    if not pid:
        reasons.append("missing cited_prop_id")
    elif pid not in VALID_PROP_IDS:
        reasons.append(f"cited_prop_id '{pid}' is not a known value prop")
    elif persona == "unknown":
        reasons.append("buyer persona unknown; cannot validate cited_prop_id")
    elif pid not in PROP_BY_PERSONA.get(persona, set()):
        reasons.append(
            f"cited_prop_id '{pid}' does not match the buyer's persona ({persona})")

    # 6. signal IDs must not leak into the prose (they belong in cited_signal_ids)
    leaked = _SIGID_RE.findall(scan)
    if leaked:
        reasons.append(f"signal IDs in the text (use cited_signal_ids): "
                       f"{sorted(set(s.lower() for s in leaked))}")

    # 7. lengths
    if not no_address:
        words = len(_strip_optout(body).split())
        if words > EMAIL_MAX_WORDS:
            reasons.append(f"email body {words} words > {EMAIL_MAX_WORDS}")
    if len(note) > LINKEDIN_MAX_CHARS:
        reasons.append(f"linkedin note {len(note)} chars > {LINKEDIN_MAX_CHARS}")

    return {
        "status": "needs_review" if reasons else "passed",
        "review_reasons": reasons,
    }


def verify_drafts(drafts: list[dict], research_by_id: dict[str, dict]) -> list[dict]:
    """Verify a batch. research_by_id maps apollo_id -> research object."""
    out = []
    for d in drafts:
        research = research_by_id.get(d.get("apollo_id"), {})
        result = verify_draft(d, research)
        out.append({**d, **result})
    return out
