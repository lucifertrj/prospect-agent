---
language:
- en
license: mit
task_categories:
- text-generation
- evaluation
tags:
- sales
- b2b
- eval-harness
- lead-scoring
- outreach
pretty_name: Gong Prospector 20-Prospect Golden Evaluation Dataset
size_categories:
- n<1K
---

# Gong Prospector Golden Evaluation Dataset (PRD §17.b)

This golden evaluation dataset contains 20 frozen, real B2B prospects used as the ground truth benchmark for evaluating Gong's automated research, lead scoring, deterministic guardrails, and outreach generation agents.

## Dataset Summary

- **Total Prospects:** 20
- **Coverage:**
  - **Persona Tiers:** CRO (6), VP of Sales (2), Director of Sales (2), Sales Enablement (4), RevOps (6).
  - **Company Size:** Spread across small, mid-market, and enterprise, with accounts outside 200–2000 (Assignar=69, Coconut Software=160, Tekion Corp=2500).
  - **Regions:** United States (17), Canada (2: Coconut Software, Tekion Corp), Australia (1: Assignar). Meets the >= 2 non-US/EU region requirement.
  - **Tenure:** >= 4 prospects with `months_in_role <= 6` (Yevhen Fedorenko=3, Patrick Hickey=4, Varun Kaushik=4, Dani Trom=2).
  - **Signals:** Real Tavily news hits across `funding`, `sales_hiring`, `new_leader`, plus an Apollo vs. news contradiction case (`Momentive Software`). Accounts with no recent signals stay strictly `signals: []`.
- **Determinism:** Lead scores and check parameters are generated using deterministic logic in `tools/score_prospect.py` and `tools/filter_prospects.py` evaluated at frozen `today = 2026-10-04`.

## Dataset Structure

Each line in `dataset.jsonl` contains the following fields:

| Group | Field | Type | Description |
| --- | --- | --- | --- |
| **Key** | `apollo_id` | string | Unique Apollo prospect identifier |
| **Account** | `domain` | string | Normalized corporate domain |
| | `account_name` | string | Company name |
| | `industry` | string | Industry classification |
| | `employees` | int | Employee count from firmographics |
| | `region` | string | Country/region of the prospect |
| | `funding_stage` | string/null | Reported funding stage |
| | `funding_date` | string/null | Date of latest funding |
| **Buyer** | `title` | string | Job title |
| | `persona` | string | Persona category (CRO, VP Sales, Director of Sales, Enablement, RevOps) |
| | `seniority` | string | Apollo seniority level |
| | `months_in_role` | int/null | Buyer months in current role |
| | `email` | string | Verified email address |
| | `email_status` | string | `verified`, `unverified`, or `unavailable` |
| | `linkedin_url` | string | Buyer LinkedIn profile URL |
| **Signals** | `signals` | list[dict] | Real Tavily news signals with id, type, summary, date, url, publisher |
| **Expected Score** | `account_fit` | int | Deterministic account fit score (0-40) |
| | `persona_fit` | int | Deterministic persona fit score (0-20) |
| | `intent` | int | Deterministic intent score (0-25) |
| | `timing` | int | Deterministic timing score (0-15) |
| | `total` | int | Sum total lead score (0-100) |
| | `label` | string | Priority now / Strong fit / Not now |
| | `confidence` | string | high / low (binary) |
| **Expected Checks** | `allowed_signal_ids` | list[string] | List of valid signal IDs |
| | `flags` | list[string] | Flags (e.g. contradiction warnings) |
| | `expected_prop_id` | string | Approved value prop ID matching persona and signal |
| **Reference Draft** | `email_subject` | string | Grounded, personalized email subject |
| | `email_body` | string | Grounded email body adhering to 120-word limit |
| | `linkedin_note` | string | LinkedIn connection note <= 200 characters |
| | `cited_signal_ids` | list[string] | Signal IDs cited in the draft |
| | `cited_prop_id` | string | Value prop ID cited in the draft |

## Usage

```python
import json

with open("eval/golden/dataset.jsonl") as f:
    golden_set = [json.loads(line) for line in f]

print(f"Loaded {len(golden_set)} prospects.")
```
