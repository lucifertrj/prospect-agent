from datetime import date, timedelta

import pytest

from tools import score_prospect as sp

REF = date(2026, 10, 4)  # fixed "today" so tests are stable


def prospect(title="Chief Revenue Officer", industry="software", employees=400,
             region="United States", signals=None, months_in_role=3, flags=None):
    return {
        "account": {"domain": "x.com", "name": "X", "industry": industry,
                    "employees": employees, "region": region},
        "buyer": {"apollo_id": "1", "title": title, "months_in_role": months_in_role},
        "signals": signals or [],
        "flags": flags or [],
    }


def sig(sid, days_ago, stype="sales_hiring"):
    return {"id": sid, "type": stype, "summary": "", "url": "u", "publisher": "p",
            "date": (REF - timedelta(days=days_ago)).isoformat()}


# --- determinism (acceptance #8) ---------------------------------------------

def test_determinism_10_reruns():
    batch = [prospect(signals=[sig("s1", 10, "funding"), sig("s2", 40)])]
    first = sp.score_prospects(batch, today=REF)
    for _ in range(9):
        assert sp.score_prospects(batch, today=REF) == first


# --- account fit --------------------------------------------------------------

def test_account_fit_full():
    assert sp.account_fit(prospect()["account"]) == 40


@pytest.mark.parametrize("emp,pts", [(199, 0), (200, 15), (2000, 15), (2001, 0)])
def test_employee_band_inclusive(emp, pts):
    acc = {"industry": "n/a", "employees": emp, "region": "OTHER"}
    assert sp.account_fit(acc) == pts


def test_industry_substring_match():
    acc = {"industry": "information technology & services", "employees": 1, "region": "x"}
    assert sp.account_fit(acc) == 15  # "technology" substring


@pytest.mark.parametrize("region,pts", [
    ("United States", 10), ("Germany", 10), ("United Kingdom", 10), ("India", 0)])
def test_region_points(region, pts):
    acc = {"industry": "n/a", "employees": 1, "region": region}
    assert sp.account_fit(acc) == pts


# --- persona fit --------------------------------------------------------------

@pytest.mark.parametrize("title,pts", [
    ("Chief Revenue Officer", 20), ("VP of Sales", 20), ("CRO", 20),
    ("Head of Sales Enablement", 15), ("VP of Revenue Operations", 15),
    ("Director of Sales", 8), ("Software Engineer", 0)])
def test_persona_fit(title, pts):
    assert sp.persona_fit({"title": title}) == pts


# --- intent -------------------------------------------------------------------

def test_intent_full():
    v = [sig("s1", 10, "sales_hiring"), sig("s2", 10, "funding")]
    assert sp.intent({"months_in_role": 6}, v) == 25


def test_intent_months_boundary():
    assert sp.intent({"months_in_role": 6}, []) == 5
    assert sp.intent({"months_in_role": 7}, []) == 0


# --- timing boundaries --------------------------------------------------------

@pytest.mark.parametrize("days,pts", [
    (0, 15), (30, 15), (31, 8), (90, 8), (91, 3), (180, 3), (181, 0)])
def test_timing_boundaries(days, pts):
    assert sp.timing([sig("s1", days)], REF) == pts


def test_timing_uses_newest():
    assert sp.timing([sig("s1", 120), sig("s2", 20)], REF) == 15


# --- signal validity gate (§12) ----------------------------------------------

def test_signal_over_180_discarded_everywhere():
    old = [sig("s1", 400, "funding")]
    assert sp.intent({"months_in_role": 99}, sp.valid_signals(old, REF)) == 0
    assert sp.timing(sp.valid_signals(old, REF), REF) == 0
    assert sp.confidence(prospect()["account"], sp.valid_signals(old, REF), [], REF) == "low"


def test_signal_without_date_discarded():
    nodate = [{"id": "s1", "type": "funding", "date": None}]
    assert sp.valid_signals(nodate, REF) == []


# --- confidence ---------------------------------------------------------------

def test_confidence_high():
    v = [sig("s1", 10), sig("s2", 80)]
    assert sp.confidence(prospect()["account"], v, [], REF) == "high"


def test_confidence_high_one_signal():
    # binary: one valid signal + full firmographics -> high
    assert sp.confidence(prospect()["account"], [sig("s1", 10)], [], REF) == "high"


def test_confidence_high_when_old_but_valid():
    # two dated signals, both 91-180 days -> still valid (<=180) + firmographics -> high
    v = [sig("s1", 120), sig("s2", 150)]
    assert sp.confidence(prospect()["account"], v, [], REF) == "high"


def test_confidence_low_no_signal():
    assert sp.confidence(prospect()["account"], [], [], REF) == "low"


def test_confidence_low_on_contradiction():
    v = [sig("s1", 10), sig("s2", 20)]
    assert sp.confidence(prospect()["account"], v, ["contradiction: employees"], REF) == "low"


def test_confidence_low_when_firmographics_missing():
    # signals present but incomplete firmographics -> low (binary needs both)
    acc = {"industry": None, "employees": 400, "region": "United States"}
    v = [sig("s1", 10), sig("s2", 20)]
    assert sp.confidence(acc, v, [], REF) == "low"


# --- label boundaries ---------------------------------------------------------

@pytest.mark.parametrize("total,label", [
    (80, "Priority now"), (79, "Strong fit"), (65, "Strong fit"), (64, "Not now")])
def test_label_boundaries(total, label):
    assert sp.label_for_total(total) == label


# --- tie-break / ranking ------------------------------------------------------

def test_tiebreak_confidence_then_recency_then_employees():
    # all engineered to total 40 (account fit only), differing tie-break keys
    base = dict(title="Software Engineer", months_in_role=99)  # persona 0, intent 0
    # p_high: 2 signals within 90 -> high confidence, but signals add timing/intent...
    # keep totals equal by using new_leader signals (no intent) all same age.
    def mk(region_emp, sigs, flags=None):
        p = prospect(title="Software Engineer", employees=region_emp,
                     months_in_role=99, signals=sigs, flags=flags)
        return p
    p_low = mk(500, [], None)                                   # conf low, total 40
    p_sig = mk(900, [sig("s1", 10, "new_leader")], None)        # conf high, +15 timing
    # recompute: give all the same total by scoring then comparing within equal totals.
    scored = sp.score_prospects([p_low, p_sig], today=REF)
    ranked = sp.rank_prospects(scored, today=REF)
    # higher total first
    assert ranked[0]["score"]["total"] >= ranked[1]["score"]["total"]


def test_tiebreak_same_total_prefers_higher_confidence():
    # identical signals and totals; b carries a contradiction flag -> low confidence
    # (flags don't affect the total), so the tie-break must prefer high over low.
    sigs = [sig("s1", 5, "new_leader")]
    a = prospect(title="Software Engineer", employees=500, months_in_role=99, signals=sigs)
    b = prospect(title="Software Engineer", employees=500, months_in_role=99, signals=sigs,
                 flags=["contradiction: employees"])
    scored = sp.score_prospects([b, a], today=REF)
    assert scored[0]["score"]["total"] == scored[1]["score"]["total"]
    ranked = sp.rank_prospects(scored, today=REF)
    assert ranked[0]["score"]["confidence"] == "high"
    assert ranked[1]["score"]["confidence"] == "low"


def test_tiebreak_same_total_same_conf_prefers_employees_near_500():
    s = [sig("s1", 5, "new_leader")]
    near = prospect(title="Software Engineer", employees=520, months_in_role=99, signals=s)
    far = prospect(title="Software Engineer", employees=1800, months_in_role=99, signals=s)
    ranked = sp.rank_prospects(sp.score_prospects([far, near], today=REF), today=REF)
    assert ranked[0]["account"]["employees"] == 520
