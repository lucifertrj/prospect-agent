#!/usr/bin/env bash
# 0.2 Tavily smoke test: one news search for a known company, last 180 days.
# Saves fixtures/tavily_search.json. Done when results have a URL and publish date.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
: "${TAVILY_API_KEY:?TAVILY_API_KEY missing in .env}"

curl -s -X POST https://api.tavily.com/search \
  -H "Content-Type: application/json" \
  -d "{
    \"api_key\": \"${TAVILY_API_KEY}\",
    \"query\": \"Databricks funding OR sales hiring\",
    \"topic\": \"news\",
    \"days\": 180,
    \"max_results\": 5
  }" | tee fixtures/tavily_search.json | python3 -m json.tool | head -40
