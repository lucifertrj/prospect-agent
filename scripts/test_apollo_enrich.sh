import argparse, json, os, re, sys, urllib.error, urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "prospects.json"
DNC_PATH = ROOT / "kb" / "do_not_contact.md"
API = "https://api.apollo.io/api/v1"
MAX_N, MAX_PAGES, BATCH = 30, 3, 10

SEARCH = {
    "person_titles": ["Chief Revenue Officer", "VP of Sales", "Head of Sales Enablement",
                      "VP of Revenue Operations", "Director of Sales"],
    "person_seniorities": ["c_suite", "vp", "head", "director"],
    "organization_num_employees_ranges": ["201,500", "501,1000", "1001,2000"],
    "q_organization_keyword_tags": ["software"],
    "person_locations": ["United States"],
    "per_page": 100,
}
STOP = {"inc", "llc", "ltd", "corp", "corporation", "co", "company", "software",
        "technologies", "technology", "group", "holdings", "the"}


def load_env():
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    if not os.environ.get("APOLLO_API_KEY"):
        sys.exit("APOLLO_API_KEY missing in .env")


def post(path, body):
    req = urllib.request.Request(
        f"{API}/{path}", data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json", "Cache-Control": "no-cache",
                 "X-Api-Key": os.environ["APOLLO_API_KEY"]})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"Apollo {path} failed: HTTP {e.code} {e.read().decode()[:300]}")


def norm_name(s):
    words = re.sub(r"[^a-z0-9 ]", " ", (s or "").lower()).split()
    return " ".join(w for w in words if w not in STOP)


def norm_domain(s):
    s = re.sub(r"^https?://", "", (s or "").lower().strip())
    return s.removeprefix("www.").split("/")[0]


def load_dnc():
    names, domains = set(), set()
    if not DNC_PATH.exists():
        print("warning: kb/do_not_contact.md not found, no exclusions applied")
        return names, domains
    for line in DNC_PATH.read_text().splitlines():
        line = line.strip().lstrip("-* ").strip()
        if not line or line.startswith("#"):
            continue
        for part in (p.strip() for p in line.split("|")):
            if "." in part and " " not in part:
                domains.add(norm_domain(part))
            elif norm_name(part):
                names.add(norm_name(part))
    return names, domains


def rank(title):
    t = (title or "").lower()
    if "chief revenue" in t or re.search(r"\bcro\b", t) or ("sales" in t and ("vp" in t or "vice president" in t)):
        return 0
    if "enablement" in t or "revenue operations" in t or "revops" in t:
        return 1
    if "director" in t:
        return 2
    return 3


def months_in_role(m):
    for job in m.get("employment_history") or []:
        if job.get("current") and job.get("start_date"):
            y, mo = map(int, job["start_date"][:7].split("-"))
            t = date.today()
            return (t.year - y) * 12 + (t.month - mo)
    return None


def to_buyer(m):
    org = m.get("organization") or {}
    domain = norm_domain(org.get("primary_domain") or org.get("website_url"))
    email = m.get("email")
    return {
        "account": {"domain": domain, "name": org.get("name"), "industry": org.get("industry"),
                    "employees": org.get("estimated_num_employees"),
                    "region": m.get("country") or org.get("country"),
                    "funding_hint": {"stage": org.get("latest_funding_stage"),
                                     "date": org.get("latest_funding_round_date")}},
        "buyer": {"apollo_id": m.get("id"),
                  "name": " ".join(x for x in [m.get("first_name"), m.get("last_name")] if x) or m.get("name"),
                  "title": m.get("title"), "seniority": m.get("seniority"),
                  "months_in_role": months_in_role(m), "linkedin_url": m.get("linkedin_url"),
                  "email": email,
                  "email_status": "unavailable" if not email
                                  else "verified" if m.get("email_status") == "verified" else "unverified"},
        "signals": [],
        "flags": [] if domain else ["domain_missing"],
    }


def build_buyers(raw, dnc_domains):
    buyers, seen_domains = [], set()
    for m in raw.values():
        b = to_buyer(m)
        d = b["account"]["domain"]
        if d and d in dnc_domains:
            print(f"dropped {b['account']['name']} ({d}): do-not-contact by domain; add its name to the list")
            continue
        if d and d in seen_domains:          # one buyer per account
            continue
        seen_domains.add(d)
        buyers.append(b)
    return buyers


def save(raw, buyers):
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "apollo", "query": SEARCH, "count": len(buyers),
        "buyers": buyers, "raw": raw}, indent=2))
    for b in buyers:
        a, p = b["account"], b["buyer"]
        print(f'{p["name"]} | {p["title"]} | {a["name"]} | {a["domain"]} | {a["employees"]} | '
              f'{a["industry"]} | {a["region"]} | {p["months_in_role"]} mo | {p["email"]} ({p["email_status"]})')
    print(f"\nwrote {OUT.relative_to(ROOT)}: {len(buyers)} buyers")


def search_and_pick(n, dnc_names, raw):
    known_orgs = {norm_name((m.get("organization") or {}).get("name")): m for m in raw.values()}
    best, excluded, total = {}, set(), None
    for page in range(1, MAX_PAGES + 1):                      # search is free; page until enough companies
        data = post("mixed_people/api_search", {**SEARCH, "page": page})
        total = data.get("total_entries")
        for p in data.get("people") or []:
            org = (p.get("organization") or {}).get("name", "")
            key = norm_name(org)
            if not org or not p.get("has_email"):
                continue
            if key in dnc_names:
                excluded.add(org)
                continue
            if key in known_orgs:                             # already enriched at this company: reuse, 0 credits
                m = known_orgs[key]
                best[key] = {"id": m["id"], "title": m.get("title"), "first_name": m.get("first_name"), "org": org}
                continue
            if key not in best or rank(p["title"]) < rank(best[key]["title"]):
                best[key] = {"id": p["id"], "title": p["title"], "first_name": p["first_name"], "org": org}
        if len(best) >= n or not data.get("people"):
            break
    picks = sorted(best.values(), key=lambda p: rank(p["title"]))[:n]
    print(f"search: {total} matches | excluded by name: {sorted(excluded) or 'none'} | picks: {len(picks)}")
    for p in picks:
        tag = "cached" if p["id"] in raw else "new"
        print(f"  [{tag}] {p['first_name']} | {p['title']} | {p['org']}")
    if len(picks) < n:
        print(f"warning: only {len(picks)} of {n}; loosen filters or raise MAX_PAGES")
    return picks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("n", nargs="?", type=int, default=MAX_N)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--remap", action="store_true")
    ap.add_argument("--yes", action="store_true", help="skip the credit confirmation")
    args = ap.parse_args()

    raw = json.loads(OUT.read_text()).get("raw", {}) if OUT.exists() else {}
    dnc_names, dnc_domains = load_dnc()

    if args.remap:
        save(raw, build_buyers(raw, dnc_domains))
        return

    load_env()
    n = min(args.n, MAX_N)
    picks = search_and_pick(n, dnc_names, raw)
    new_ids = [p["id"] for p in picks if p["id"] not in raw]
    print(f"\nalready enriched: {len(picks) - len(new_ids)} (0 credits) | new: {len(new_ids)} (~{len(new_ids)} credits)")
    if args.dry_run or not new_ids:
        if args.dry_run:
            print("dry run: no credits spent")
        else:
            save(raw, build_buyers(raw, dnc_domains))
        return
    if not args.yes and input(f"Spend ~{len(new_ids)} Apollo credits? [y/N] ").strip().lower() != "y":
        print("cancelled: no credits spent")
        return

    for i in range(0, len(new_ids), BATCH):                   # bulk_match: max 10 per call
        res = post("people/bulk_match", {"details": [{"id": x} for x in new_ids[i:i + BATCH]],
                                         "reveal_personal_emails": False, "reveal_phone_number": False})
        for m in filter(None, res.get("matches") or []):
            raw[m["id"]] = m
        save(raw, build_buyers(raw, dnc_domains))             # save after each batch: a failure keeps paid data
    print(f"enriched {len(new_ids)} people in {(len(new_ids) + BATCH - 1) // BATCH} call(s)")


if __name__ == "__main__":
    main()