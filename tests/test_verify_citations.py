from tools import score_prospect as sp
from tools import verify_citations as vc


def research(region="United States", signal_ids=("s1", "s2"),
             title="VP of Sales", summaries=None):
    summaries = summaries or {}
    return {
        "account": {"domain": "x.com", "name": "X", "region": region},
        "buyer": {"apollo_id": "1", "title": title},
        "signals": [{"id": s, "type": "funding", "date": "2026-09-01",
                     "url": "u", "publisher": "p",
                     "summary": summaries.get(s, "Company raised a new round")}
                    for s in signal_ids],
    }


# A clean, passing draft: opt-out line present, valid prop for a VP Sales buyer,
# no numbers, no leaked signal IDs.
GOOD_BODY = ("Saw the news about your team. Gong gives full visibility into every "
             "conversation, which is why it helps. Open to a short chat?\n\n"
             + vc.OPT_OUT_LINE)
GOOD_NOTE = ("Saw your hiring news - Gong gives visibility into every "
             "conversation. Worth a quick connect?")


def draft(subject="Noticed your team is hiring", body=GOOD_BODY, note=GOOD_NOTE,
          cited=("s1",), prop="vp-visibility", email_status=None, apollo_id="1"):
    email = {"subject": subject, "body": body}
    if email_status:
        email["status"] = email_status
    return {"apollo_id": apollo_id, "email": email, "linkedin_note": note,
            "cited_signal_ids": list(cited), "cited_prop_id": prop}


# --- drift guard: the two region classifiers must agree ----------------------

def test_region_classifiers_agree():
    samples = ["United States", "us", "Germany", "United Kingdom", "UK", "France",
               "India", "Canada", "", None, "the netherlands"]
    for s in samples:
        assert sp.classify_region(s) == vc.classify_region(s)


# --- happy path ---------------------------------------------------------------

def test_clean_draft_passes():
    r = vc.verify_draft(draft(), research())
    assert r["status"] == "passed", r["review_reasons"]


# --- blocked phrases: word boundaries ----------------------------------------

def test_blocked_phrase_caught():
    r = vc.verify_draft(draft(body="Our guaranteed offer is the best in class.\n\n"
                              + vc.OPT_OUT_LINE), research())
    assert r["status"] == "needs_review"
    assert any("blocked" in x for x in r["review_reasons"])


def test_roi_blocked_as_a_word():
    r = vc.verify_draft(draft(body="Strong ROI is the point.\n\n" + vc.OPT_OUT_LINE),
                        research())
    assert any("roi" in x for x in r["review_reasons"])


def test_roi_substring_in_detroit_does_not_trip():
    body = ("Noticed your Detroit office is hiring. Gong gives visibility into "
            "every conversation. Open to a chat?\n\n" + vc.OPT_OUT_LINE)
    r = vc.verify_draft(draft(body=body), research())
    assert r["status"] == "passed", r["review_reasons"]


def test_hash_one_blocked_but_not_hash_ten():
    bad = vc.verify_draft(draft(body="We are #1 here.\n\n" + vc.OPT_OUT_LINE),
                          research())
    assert any("blocked" in x for x in bad["review_reasons"])
    ok = vc.verify_draft(
        draft(body="See point #10 below. Gong gives visibility into every "
              "conversation.\n\n" + vc.OPT_OUT_LINE), research())
    assert not any("blocked" in x for x in ok["review_reasons"]), ok["review_reasons"]


# --- numbers: must appear in a cited signal's summary ------------------------

def test_number_not_in_signal_is_blocked():
    r = vc.verify_draft(draft(body="We can boost your pipeline by 32% this "
                              "quarter.\n\n" + vc.OPT_OUT_LINE), research())
    assert r["status"] == "needs_review"
    assert any("numbers" in x.lower() for x in r["review_reasons"])


def test_number_in_cited_signal_passes():
    r = research(summaries={"s1": "The company posted 15 AE roles this month"})
    body = ("Saw you opened 15 AE roles. Gong gives visibility into every "
            "conversation. Open to a chat?\n\n" + vc.OPT_OUT_LINE)
    out = vc.verify_draft(draft(body=body, cited=("s1",)), r)
    assert out["status"] == "passed", out["review_reasons"]


def test_number_from_uncited_signal_is_blocked():
    # 15 is in s2's summary, but the draft only cites s1 -> still blocked.
    r = research(summaries={"s2": "The company posted 15 AE roles this month"})
    body = ("Saw you opened 15 AE roles.\n\n" + vc.OPT_OUT_LINE)
    out = vc.verify_draft(draft(body=body, cited=("s1",)), r)
    assert any("numbers" in x.lower() for x in out["review_reasons"])


# --- competitor names ---------------------------------------------------------

def test_competitor_name_caught():
    r = vc.verify_draft(draft(body="Unlike Salesloft, we focus on real "
                              "conversations.\n\n" + vc.OPT_OUT_LINE), research())
    assert any("competitor" in x for x in r["review_reasons"])


# --- cited_prop_id ------------------------------------------------------------

def test_cited_signal_not_in_account():
    r = vc.verify_draft(draft(cited=("s9",)), research())
    assert any("s9" in x for x in r["review_reasons"])


def test_missing_cited_prop_id_caught():
    r = vc.verify_draft(draft(prop=None), research())
    assert any("cited_prop_id" in x for x in r["review_reasons"])


def test_unknown_cited_prop_id_caught():
    r = vc.verify_draft(draft(prop="vp-madeup"), research())
    assert any("not a known value prop" in x for x in r["review_reasons"])


def test_cited_prop_id_persona_mismatch_caught():
    # vp-forecast is the CRO prop; a VP Sales buyer may not use it.
    r = vc.verify_draft(draft(prop="vp-forecast"), research(title="VP of Sales"))
    assert any("does not match the buyer's persona" in x for x in r["review_reasons"])


def test_director_of_sales_uses_vp_sales_props():
    r = vc.verify_draft(draft(prop="vp-ramp"), research(title="Director of Sales"))
    assert r["status"] == "passed", r["review_reasons"]


def test_cro_prop_passes_for_cro():
    r = vc.verify_draft(draft(prop="vp-forecast"),
                        research(title="Chief Revenue Officer"))
    assert r["status"] == "passed", r["review_reasons"]


# --- signal IDs must not leak into the text ----------------------------------

def test_signal_id_in_body_caught():
    body = ("As s1 shows, your team is hiring. Gong gives visibility.\n\n"
            + vc.OPT_OUT_LINE)
    r = vc.verify_draft(draft(body=body), research())
    assert any("signal IDs in the text" in x for x in r["review_reasons"])


# --- lengths ------------------------------------------------------------------

def test_email_too_long():
    long_body = " ".join(["word"] * 121) + "\n\n" + vc.OPT_OUT_LINE
    r = vc.verify_draft(draft(body=long_body), research())
    assert any("words" in x for x in r["review_reasons"])


def test_linkedin_too_long():
    r = vc.verify_draft(draft(note="x" * 301), research())
    assert any("linkedin" in x.lower() for x in r["review_reasons"])


def test_optout_excluded_from_word_count():
    body = " ".join(["word"] * 118) + "\n\n" + vc.OPT_OUT_LINE
    r = vc.verify_draft(draft(body=body), research())
    assert not any("words" in x for x in r["review_reasons"]), r["review_reasons"]


# --- opt-out line removed (2026-10-05): no longer required -------------------

def test_email_without_optout_passes():
    body = ("Saw your hiring news. Gong gives visibility into every conversation. "
            "Open to a short chat?")  # no opt-out line, and that's fine now
    r = vc.verify_draft(draft(body=body), research(region="United States"))
    assert r["status"] == "passed", r["review_reasons"]


def test_fixed_signoff_address_not_flagged_as_numbers():
    body = ("Saw your hiring news. Gong gives visibility into every conversation. "
            "Open to a short chat?\n\n"
            "Tarun Jain\nFounding GTM, Gong\n"
            "201 Spear Street, 13th Floor, San Francisco, CA 94105")
    r = vc.verify_draft(draft(body=body), research())
    assert r["status"] == "passed", r["review_reasons"]


# --- no-address case ----------------------------------------------------------

def test_no_address_skips_email_checks_but_checks_note():
    r = vc.verify_draft(
        draft(body="", note="Saw your news - worth a connect?",
              email_status="no-address"), research())
    assert r["status"] == "passed", r["review_reasons"]


def test_no_address_still_catches_bad_note():
    r = vc.verify_draft(
        draft(body="", note="We guarantee results, unlike Clari.",
              email_status="no-address"), research())
    assert r["status"] == "needs_review"


# --- catch rate (acceptance #11, >= 95%) -------------------------------------

def test_catch_rate_on_seeded_bad_claims():
    """Realistic bad drafts the detector must generalize to. One pure spelled-out
    number ('doubles your win rate') is a KNOWN miss (no digit, not a blocked
    phrase) — kept in to see the gap, not design it away. 19/20 = 95% >= target.
    Numbers are blocked because none appear in the (number-free) cited signals."""
    bad_bodies = [
        "We guarantee results in 30 days.",
        "Our ROI is unmatched.",
        "Boost revenue by 40% with Gong.",
        "We are the industry-leading platform.",
        "A revolutionary, game-changer for your team.",
        "Best-in-class coaching, risk-free.",
        "Unlike Salesloft, we win.",
        "We beat ZoomInfo on data quality.",
        "Close more deals by 2x this year.",
        "Our #1 ranked tool is proven to work.",
        "Increase revenue by $1M next quarter.",
        "World-class, cutting-edge AI.",
        "No risk, guaranteed pipeline growth.",
        "Chorus can't match our visibility.",
        "Return on investment in 90 days.",
        "Market leader in revenue intelligence.",
        "We lifted win rates 32% for clients.",
        "Get 3x more meetings booked.",
        "Clari users switch to us for a reason.",
        "We doubles your win rate.",  # KNOWN MISS: spelled-out, no digit/phrase
    ]
    caught = 0
    for b in bad_bodies:
        r = vc.verify_draft(draft(body=b + "\n\n" + vc.OPT_OUT_LINE), research())
        if r["status"] == "needs_review":
            caught += 1
    rate = caught / len(bad_bodies)
    assert rate >= 0.95, f"catch rate {rate:.0%} ({caught}/{len(bad_bodies)})"
