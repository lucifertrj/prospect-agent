"""Run LLM Judge across the 20 golden prospects from dataset.jsonl to compute and store the baseline.
Uses Google Gemini 3.5 Flash via Lyzr Studio API at temperature 0.0.
"""
import json
import os
import re
import sys
import time
import urllib.request
from pathlib import Path
import dotenv

ROOT = Path(__file__).resolve().parent.parent
dotenv.load_dotenv(ROOT / ".env")
key = os.environ.get("LYZR_API_KEY")
if not key:
    sys.exit("LYZR_API_KEY missing in .env")

judge_instructions = (ROOT / "eval" / "judge_instructions.md").read_text()
persona_pains = (ROOT / "kb" / "persona_pains.txt").read_text()
value_props = (ROOT / "kb" / "value_props.txt").read_text()
persona_map = f"{persona_pains}\n\n{value_props}"

dataset_file = ROOT / "eval" / "golden" / "dataset.jsonl"
with open(dataset_file) as f:
    rows = [json.loads(line) for line in f]

agent_payload = {
    "name": "Eval Harness LLM Judge Agent",
    "agent_role": "Independent Grader",
    "agent_instructions": judge_instructions,
    "agent_goal": "Grade outreach drafts according to the rubric",
    "provider_id": "google",
    "model": "gemini-3.5-flash",
    "top_p": 1.0,
    "temperature": 0.0,
}

req = urllib.request.Request(
    "https://agent-prod.studio.lyzr.ai/v3/agents/",
    data=json.dumps(agent_payload).encode(),
    headers={"Content-Type": "application/json", "x-api-key": key},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    agent_info = json.load(resp)
    aid = agent_info["agent_id"]
    print("Created judge agent on Lyzr:", aid)

judge_results = []
try:
    for i, r in enumerate(rows):
        aid_prospect = r["apollo_id"]
        judge_input = {
            "buyer": {
                "apollo_id": aid_prospect,
                "title": r["title"],
                "seniority": r["seniority"],
                "months_in_role": r["months_in_role"],
            },
            "account": {
                "name": r["account_name"],
                "domain": r["domain"],
                "industry": r["industry"],
                "employees": r["employees"],
                "region": r["region"],
            },
            "signals": r["signals"],
            "draft": {
                "email": {
                    "subject": r["email_subject"],
                    "body": r["email_body"],
                },
                "linkedin_note": r["linkedin_note"],
                "cited_signal_ids": r["cited_signal_ids"],
                "cited_prop_id": r["cited_prop_id"],
            },
            "persona_map": persona_map,
        }
        chat_payload = {
            "user_id": "eval_user",
            "agent_id": aid,
            "session_id": f"golden_eval_{aid_prospect}_{int(time.time())}",
            "message": json.dumps(judge_input),
        }
        score_data = None
        for attempt in range(3):
            try:
                req_chat = urllib.request.Request(
                    "https://agent-prod.studio.lyzr.ai/v3/inference/chat/",
                    data=json.dumps(chat_payload).encode(),
                    headers={"Content-Type": "application/json", "x-api-key": key},
                    method="POST",
                )
                with urllib.request.urlopen(req_chat, timeout=60) as resp_chat:
                    resp_data = json.load(resp_chat)
                    resp_text = resp_data.get("response", "{}")
                    m = re.search(r"\{.*\}", resp_text, re.DOTALL)
                    if m:
                        score_data = json.loads(m.group(0))
                    else:
                        score_data = json.loads(resp_text)
                    break
            except Exception as ex:
                if attempt == 2:
                    raise
                time.sleep(2)

        judge_results.append({
            "apollo_id": aid_prospect,
            "account_name": r["account_name"],
            "persona": r["persona"],
            **score_data,
        })
        print(f"[{i+1:2d}/20] {r['account_name']:25s} ({r['persona']:15s}) | overall={score_data.get('overall')} | {score_data.get('rationale')[:60]}")
        time.sleep(0.4)

    overalls = [res["overall"] for res in judge_results]
    mean_overall = sum(overalls) / len(overalls)
    print(f"\n==========================================")
    print(f"Mean Overall Score: {mean_overall:.2f} (Target: >= 4.0)")
    print(f"==========================================")

    baseline_record = {
        "model_family": "google/gemini-3.5-flash",
        "temperature": 0.0,
        "mean_overall": round(mean_overall, 3),
        "target_threshold": 4.0,
        "draft_scores": judge_results,
    }
    out_file = ROOT / "eval" / "golden" / "judge_baseline.json"
    out_file.write_text(json.dumps(baseline_record, indent=2) + "\n")
    print(f"Wrote committed judge baseline to {out_file.relative_to(ROOT)}")

finally:
    try:
        req_del = urllib.request.Request(
            f"https://agent-prod.studio.lyzr.ai/v3/agents/{aid}",
            headers={"x-api-key": key},
            method="DELETE",
        )
        urllib.request.urlopen(req_del)
        print("Cleaned up judge agent:", aid)
    except Exception as e:
        print("Agent cleanup error:", e)
