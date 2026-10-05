"""tests/test_eval_harness.py: Automated tests for Eval Harness (PRD §17.b).

Tests:
  - Golden dataset coverage criteria (5 persona tiers, company size, regions, tenure, signals)
  - Golden dataset columns (all 31 required columns)
  - Local replay mode (zero credits, deterministic tools reproduction)
  - Corrupt draft detection (each check turns red and named)
  - Release gate enforcement (blocks on check failures or judge drops)
  - Judge baseline integrity and rubric compliance
"""
import json
from datetime import date
from pathlib import Path
import pytest

from eval.harness import (
    load_frozen_today,
    load_golden_dataset,
    check_dataset_coverage,
    run_deterministic_suite,
    run_local_replay,
    evaluate_release_gate,
    apply_test_corruption,
    DEFAULT_DATASET,
    DEFAULT_BASELINE,
)
from tools.score_prospect import score_one
from tools.filter_prospects import load_dnc_file, filter_pre_enrichment, filter_post_enrichment

ROOT = Path(__file__).resolve().parent.parent


def test_golden_dataset_structure_and_columns():
    """Verify golden dataset contains 20 rows with the exact 31 specified columns."""
    rows = load_golden_dataset(DEFAULT_DATASET)
    assert len(rows) == 20, f"Expected 20 prospects, found {len(rows)}"

    expected_cols = [
        "apollo_id",
        # account
        "domain", "account_name", "industry", "employees", "region", "funding_stage", "funding_date",
        # buyer
        "title", "persona", "seniority", "months_in_role", "email", "email_status", "linkedin_url",
        # signals
        "signals",
        # expected score
        "account_fit", "persona_fit", "intent", "timing", "total", "label", "confidence",
        # expected checks
        "allowed_signal_ids", "flags", "expected_prop_id",
        # reference draft
        "email_subject", "email_body", "linkedin_note", "cited_signal_ids", "cited_prop_id",
    ]

    for i, r in enumerate(rows):
        assert list(r.keys()) == expected_cols, f"Row {i} columns mismatch: {list(r.keys())}"


def test_golden_dataset_coverage():
    """Verify PRD §1 golden set coverage requirements."""
    rows = load_golden_dataset(DEFAULT_DATASET)
    cov = check_dataset_coverage(rows)
    assert cov["passed"], f"Coverage criteria failed: {cov['issues']}"

    # Verify all 5 personas
    personas = {r["persona"] for r in rows}
    assert {"CRO", "VP Sales", "Director of Sales", "Enablement", "RevOps"} == personas

    # Verify company size outside 200-2000
    employees = [r["employees"] for r in rows]
    outside = [e for e in employees if e < 200 or e > 2000]
    assert len(outside) >= 3, f"Expected >=3 accounts outside 200-2000, got {outside}"

    # Verify >=2 non-US/EU regions
    non_us_eu = [r["region"] for r in rows if r["region"] not in ["US", "United States", "UK", "EU"]]
    assert len(non_us_eu) >= 2, f"Expected >=2 non-US/EU regions, got {non_us_eu}"

    # Verify >=3 with months_in_role <= 6
    short_tenure = [r["months_in_role"] for r in rows if r["months_in_role"] is not None and r["months_in_role"] <= 6]
    assert len(short_tenure) >= 3, f"Expected >=3 with months_in_role <= 6, got {short_tenure}"

    # Verify signal types
    all_sig_types = {s["type"] for r in rows for s in r["signals"]}
    assert "sales_hiring" in all_sig_types
    assert "funding" in all_sig_types
    assert "new_leader" in all_sig_types

    # Verify accounts with signals: [] (no fabrication)
    no_sig = [r["account_name"] for r in rows if len(r["signals"]) == 0]
    assert len(no_sig) >= 1

    # Verify contradiction case
    contradictions = [r["account_name"] for r in rows if any("contradiction" in f.lower() for f in r["flags"])]
    assert len(contradictions) >= 1


def test_local_replay_zero_credits():
    """Verify that local replay runs without network calls, reproduces all scores,
    passes all deterministic checks, and release gate passes."""
    gate_passed, results = run_local_replay(
        dataset_path=DEFAULT_DATASET,
        baseline_path=DEFAULT_BASELINE,
    )
    assert gate_passed, f"Local replay failed: {results.get('blocking_reasons')}"
    assert results["deterministic"]["passed"]
    assert len(results["deterministic"]["failed_checks"]) == 0
    assert results["judge_mean"] >= 4.0


@pytest.mark.parametrize(
    "corrupt_type,expected_failed_check",
    [
        ("signal_id", "CITED_SIGNALS_ALLOWED"),
        ("word_count", "EMAIL_LENGTH_LIMIT"),
        ("linkedin_chars", "LINKEDIN_LENGTH_LIMIT"),
        ("blocked_claim", "BLOCKED_CLAIMS"),
        ("competitor", "COMPETITOR_NAMES"),
        ("ungrounded_number", "NUMBER_GROUNDING"),
        ("prop_mismatch", "PERSONA_PROP_FIT"),
        ("score_mismatch", "SCORES_MATCH_BASELINE"),
        ("opt_out_missing", "OPT_OUT_LINE_PRESENT"),
        ("one_buyer", "ONE_BUYER_PER_ACCOUNT"),
        ("dnc_violation", "DO_NOT_CONTACT"),
    ],
)
def test_corrupt_draft_turns_checks_red_and_named(corrupt_type, expected_failed_check):
    """Verify that corrupting a draft turns the corresponding named check red,
    and blocks the release gate."""
    today = load_frozen_today()
    rows = load_golden_dataset(DEFAULT_DATASET)
    corrupted = apply_test_corruption(rows, corrupt_type)

    det_result = run_deterministic_suite(corrupted, today)
    assert not det_result["passed"], f"Expected suite to fail for corruption '{corrupt_type}'"

    failed_check_names = {f["check_name"] for f in det_result["failed_checks"]}
    assert expected_failed_check in failed_check_names, (
        f"Corruption '{corrupt_type}' failed to trigger '{expected_failed_check}'. "
        f"Actual failures: {failed_check_names}"
    )

    gate_passed, reasons = evaluate_release_gate(det_result, judge_mean=4.25, baseline_mean=4.25)
    assert not gate_passed, f"Gate must block for corruption '{corrupt_type}'"
    assert any(expected_failed_check in r for r in reasons)


def test_gate_blocks_on_low_judge_score():
    """Verify release gate blocks if judge mean falls below 4.0."""
    det_result = {"passed": True, "failed_checks": []}
    gate_passed, reasons = evaluate_release_gate(det_result, judge_mean=3.95, baseline_mean=4.25)
    assert not gate_passed
    assert any("below the 80% / 4.0 threshold" in r for r in reasons)


def test_gate_blocks_on_judge_score_drop():
    """Verify release gate blocks if judge mean drops > 0.3 vs stored baseline."""
    det_result = {"passed": True, "failed_checks": []}
    # Baseline is 4.4, current is 4.05: drop is 0.35 (> 0.3)
    gate_passed, reasons = evaluate_release_gate(det_result, judge_mean=4.05, baseline_mean=4.40)
    assert not gate_passed
    assert any("dropped" in r for r in reasons)


def test_gate_allows_when_all_conditions_satisfied():
    """Verify release gate passes when checks clean and judge score is strong."""
    det_result = {"passed": True, "failed_checks": []}
    gate_passed, reasons = evaluate_release_gate(det_result, judge_mean=4.20, baseline_mean=4.25)
    assert gate_passed
    assert len(reasons) == 0


def test_judge_baseline_file_integrity():
    """Verify the committed judge baseline file meets all requirements."""
    assert DEFAULT_BASELINE.exists(), "eval/golden/judge_baseline.json missing"
    data = json.loads(DEFAULT_BASELINE.read_text())

    assert data.get("model_family") == "google/gemini-3.5-flash"
    assert data.get("temperature") == 0.0
    mean_overall = data.get("mean_overall", 0.0)
    assert mean_overall >= 4.0, f"Judge baseline mean {mean_overall} < 4.0"

    scores = data.get("draft_scores", [])
    assert len(scores) == 20

    # Rubric invariant check: overall cannot exceed min(dimensions) + 1
    for s in scores:
        dims = [s.get("pain_match", 1), s.get("prop_fit", 1), s.get("signal_use", 1), s.get("tone", 1)]
        min_dim = min(dims)
        overall = s.get("overall", 1)
        assert overall <= min_dim + 1, f"Rubric violation on {s.get('account_name')}: overall {overall} > min_dim {min_dim} + 1"
