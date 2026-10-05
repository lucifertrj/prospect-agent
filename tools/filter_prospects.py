"""filter_prospects: deterministic do-not-contact + one-per-account filter.

Two pipeline stages, both pure and deterministic (same input -> same output):

- Pre-enrichment (by name): Apollo's free-plan search returns a company name and
  person id but no domain. Drop rows whose normalized company name is on the
  do-not-contact list, keep one buyer per account (highest persona tier, then most
  senior, PRD §12), and order by that rank so the agent can take the top 3 to enrich.
- Post-enrichment (by domain): enrichment reveals the domain. Drop any remaining row
  whose domain is on the list. No backfill enrich (credit cap).

Why a tool and not RAG (PRD §7): the list is ~300 companies. RAG returns only the
few chunks most similar to a query, so it cannot answer "is this exact company on the
list?". An exact check needs the whole list read in code, every run. This tool reads
kb/do_not_contact.md directly.

Self-contained for Studio paste (step 3.4): norm_name/norm_domain/rank mirror
scripts/test_apollo_enrich.sh (the Apollo fetch script); keep them in sync. Unlike
score_prospect, the do-not-contact list is NOT embedded here -- it is read from
kb/do_not_contact.md (bundled with the tool in Studio, or on disk in the local
fallback), so there is one copy of the list and nothing to drift.
"""
from __future__ import annotations

import re
from pathlib import Path

# --- normalization (mirror scripts/test_apollo_enrich.sh) --------------------

STOP = {"inc", "llc", "ltd", "corp", "corporation", "co", "company", "software",
        "technologies", "technology", "group", "holdings", "the"}


def norm_name(s: str | None) -> str:
    words = re.sub(r"[^a-z0-9 ]", " ", (s or "").lower()).split()
    return " ".join(w for w in words if w not in STOP)


def norm_domain(s: str | None) -> str:
    s = re.sub(r"^https?://", "", (s or "").lower().strip())
    return s.removeprefix("www.").split("/")[0]


# --- persona + seniority rank (persona mirrors the Apollo script) ------------

def persona_rank(title: str | None) -> int:
    """Persona tier as a sort key: lower is better (PRD §10 title tiers)."""
    t = (title or "").lower()
    if "chief revenue" in t or re.search(r"\bcro\b", t) \
            or ("sales" in t and ("vp" in t or "vice president" in t)):
        return 0
    if "enablement" in t or "revenue operations" in t or "revops" in t:
        return 1
    if "director" in t and "sales" in t:
        return 2
    return 3


# Apollo seniority values, most senior first. Used only for the tie-break
# "then most senior" when two buyers share the top persona tier at one account.
_SENIORITY_ORDER = ["owner", "founder", "c_suite", "partner", "vp", "head",
                    "director", "manager", "senior", "entry", "intern"]
_SENIORITY_RANK = {s: i for i, s in enumerate(_SENIORITY_ORDER)}


def seniority_rank(buyer: dict) -> int:
    return _SENIORITY_RANK.get((buyer.get("seniority") or "").strip().lower(),
                               len(_SENIORITY_ORDER))


# --- do-not-contact list -----------------------------------------------------

def load_dnc(text: str) -> tuple[set[str], set[str]]:
    """Parse the do-not-contact markdown into (names, domains).

    Each line is 'Name | domain.com' (either part optional). A bare token with a
    dot and no space is a domain; anything else is a company name. '#' lines and
    headings are ignored. Mirrors load_dnc() in the Apollo script.
    """
    names: set[str] = set()
    domains: set[str] = set()
    for line in text.splitlines():
        line = line.strip().lstrip("-* ").strip()
        if not line or line.startswith("#"):
            continue
        for part in (p.strip() for p in line.split("|")):
            if "." in part and " " not in part:
                domains.add(norm_domain(part))
            elif norm_name(part):
                names.add(norm_name(part))
    return names, domains


def _default_dnc_path() -> Path:
    return Path(__file__).resolve().parent.parent / "kb" / "do_not_contact.md"


def load_dnc_file(path: str | Path | None = None) -> tuple[set[str], set[str]]:
    p = Path(path) if path else _default_dnc_path()
    return load_dnc(p.read_text())


# --- filters -----------------------------------------------------------------

def _account(p: dict) -> dict:
    return p.get("account") or {}


def _buyer(p: dict) -> dict:
    return p.get("buyer") or {}


def filter_pre_enrichment(prospects: list[dict], dnc_names: set[str],
                          limit: int | None = None) -> list[dict]:
    """Stage 1 (before enrichment, by company name).

    Drop do-not-contact companies, keep one buyer per account (highest persona
    tier, then most senior), and order the survivors by that same rank. If `limit`
    is given, truncate to it (the agent enriches the top `limit`, usually 3).
    Account fit is equal across rows (the Apollo search filters it server-side),
    so persona tier then seniority is the whole ordering.
    """
    best: dict[str, dict] = {}
    for p in prospects:
        name = norm_name(_account(p).get("name"))
        if not name or name in dnc_names:
            continue
        key = _key_pre(p, name)
        current = best.get(key)
        if current is None or _rank_key(p) < _rank_key(current):
            best[key] = p
    ordered = sorted(best.values(), key=_rank_key)
    return ordered[:limit] if limit is not None else ordered


def filter_post_enrichment(prospects: list[dict],
                           dnc_domains: set[str]) -> list[dict]:
    """Stage 2 (after enrichment, by revealed domain). Drop any row whose domain
    is on the list. No backfill: the shortlist just shrinks (credit cap)."""
    return [p for p in prospects
            if norm_domain(_account(p).get("domain")) not in dnc_domains]


def _key_pre(p: dict, name: str) -> str:
    """One buyer per account. Prefer the revealed domain if present (two names can
    map to one company); fall back to the normalized name before enrichment."""
    domain = norm_domain(_account(p).get("domain"))
    return domain or name


def _rank_key(p: dict) -> tuple[int, int]:
    return (persona_rank(_buyer(p).get("title")), seniority_rank(_buyer(p)))


if __name__ == "__main__":
    import json
    import sys
    data = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}
    buyers = data.get("buyers", data) if isinstance(data, dict) else data
    names, domains = load_dnc_file()
    kept = filter_pre_enrichment(buyers, names)
    kept = filter_post_enrichment(kept, domains)
    for p in kept:
        a, b = _account(p), _buyer(p)
        print(f'{b.get("title")} @ {a.get("name")} ({a.get("domain")})')
    print(f"\n{len(kept)} of {len(buyers)} kept "
          f"({len(names)} names, {len(domains)} domains on the list)")
