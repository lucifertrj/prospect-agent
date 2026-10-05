from tools import filter_prospects as fp


def row(name="Acme", domain="", title="Chief Revenue Officer", seniority="c_suite"):
    return {
        "account": {"name": name, "domain": domain},
        "buyer": {"apollo_id": name + title, "title": title, "seniority": seniority},
    }


# --- normalization -----------------------------------------------------------

def test_norm_name_strips_punctuation_and_stopwords():
    assert fp.norm_name("Acme, Inc.") == "acme"
    assert fp.norm_name("Acme Software Technologies") == "acme"
    assert fp.norm_name("The Gong Company") == "gong"


def test_norm_domain_strips_scheme_and_www():
    assert fp.norm_domain("https://www.Gong.io/path") == "gong.io"
    assert fp.norm_domain("WWW.CLARI.COM") == "clari.com"


# --- do-not-contact parsing --------------------------------------------------

DNC_SAMPLE = """# header to ignore
## Gong itself
Gong | gong.io
## Competitors
ZoomInfo | zoominfo.com
Clari | clari.com
## Name only
Acme Holdings
"""


def test_load_dnc_splits_names_and_domains():
    names, domains = fp.load_dnc(DNC_SAMPLE)
    assert "gong" in names and "zoominfo" in names and "clari" in names
    assert "acme" in names                       # "Acme Holdings" -> name only
    assert {"gong.io", "zoominfo.com", "clari.com"} <= domains


# --- pre-enrichment: name filter --------------------------------------------

def test_pre_drops_do_not_contact_by_name():
    names, _ = fp.load_dnc(DNC_SAMPLE)
    rows = [row(name="Gong"), row(name="FreshCo")]
    kept = fp.filter_pre_enrichment(rows, names)
    assert [r["account"]["name"] for r in kept] == ["FreshCo"]


def test_pre_name_match_is_normalized():
    names, _ = fp.load_dnc(DNC_SAMPLE)
    # "ZoomInfo, Inc." normalizes to "zoominfo", which is on the list.
    kept = fp.filter_pre_enrichment([row(name="ZoomInfo, Inc.")], names)
    assert kept == []


def test_pre_blank_account_name_dropped():
    kept = fp.filter_pre_enrichment([row(name="")], set())
    assert kept == []


# --- pre-enrichment: one buyer per account + tie-break -----------------------

def test_one_per_account_keeps_highest_persona_tier():
    rows = [row(name="Acme", title="Director of Sales", seniority="director"),
            row(name="Acme", title="Chief Revenue Officer", seniority="c_suite")]
    kept = fp.filter_pre_enrichment(rows, set())
    assert len(kept) == 1
    assert kept[0]["buyer"]["title"] == "Chief Revenue Officer"


def test_one_per_account_tiebreak_most_senior_within_tier():
    # Both are persona tier 0 (VP of Sales); seniority breaks the tie.
    rows = [row(name="Acme", title="VP of Sales", seniority="vp"),
            row(name="Acme", title="VP of Sales, EMEA", seniority="director")]
    kept = fp.filter_pre_enrichment(rows, set())
    assert len(kept) == 1
    assert kept[0]["buyer"]["seniority"] == "vp"


def test_one_per_account_uses_domain_when_present():
    # Same company, two name spellings but one domain -> one buyer.
    rows = [row(name="Acme Inc", domain="acme.com", title="VP of Sales"),
            row(name="Acme Corporation", domain="acme.com", title="Director of Sales")]
    kept = fp.filter_pre_enrichment(rows, set())
    assert len(kept) == 1
    assert kept[0]["buyer"]["title"] == "VP of Sales"


# --- pre-enrichment: ordering + limit ----------------------------------------

def test_pre_orders_by_persona_then_limit():
    rows = [row(name="C", title="Director of Sales", seniority="director"),
            row(name="A", title="Chief Revenue Officer", seniority="c_suite"),
            row(name="B", title="Head of Sales Enablement", seniority="head")]
    kept = fp.filter_pre_enrichment(rows, set(), limit=2)
    assert [r["account"]["name"] for r in kept] == ["A", "B"]


def test_pre_is_deterministic():
    names, _ = fp.load_dnc(DNC_SAMPLE)
    rows = [row(name="Acme", title="VP of Sales"), row(name="Beta"),
            row(name="Gong")]
    first = fp.filter_pre_enrichment(rows, names, limit=5)
    for _ in range(10):
        assert fp.filter_pre_enrichment(rows, names, limit=5) == first


# --- post-enrichment: domain filter ------------------------------------------

def test_post_drops_do_not_contact_by_domain():
    _, domains = fp.load_dnc(DNC_SAMPLE)
    rows = [row(name="Gong Labs", domain="gong.io"),
            row(name="FreshCo", domain="freshco.com")]
    kept = fp.filter_post_enrichment(rows, domains)
    assert [r["account"]["domain"] for r in kept] == ["freshco.com"]


def test_post_domain_match_is_normalized():
    _, domains = fp.load_dnc(DNC_SAMPLE)
    kept = fp.filter_post_enrichment([row(domain="https://www.Clari.com")], domains)
    assert kept == []


# --- the real list: the tool reads kb/do_not_contact.md and catches entries --

def test_real_dnc_file_catches_known_entries():
    names, domains = fp.load_dnc_file()
    assert len(names) > 50 and len(domains) > 50      # the real ~300-company list
    # Known entries from the committed list are caught at both stages.
    assert fp.filter_pre_enrichment([row(name="Gong")], names) == []
    assert fp.filter_post_enrichment([row(domain="gong.io")], domains) == []
    assert fp.filter_post_enrichment([row(domain="zoominfo.com")], domains) == []
    # A company not on the list survives.
    assert len(fp.filter_pre_enrichment([row(name="Definitely Not Listed Co")],
                                        names)) == 1
