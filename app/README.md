# Gong Prospector — app

Local FastAPI backend + web UI over the deployed Studio agents. The three
deterministic tools (`tools/filter_prospects`, `score_prospect`, `verify_citations`)
run in the backend between agent calls.

## Run

```bash
pip install -r app/requirements.txt
uvicorn app.server:app --reload --port 8000   # from the repo root
# open http://localhost:8000
```

Secrets come from `.env` (never committed): `LYZR_API_KEY`, `LYZR_USER_ID`, the three
`LYZR_*_AGENT_ID`s, `LYZR_KB_ID`, and optional Supabase / Apollo / Tavily keys.

## Supabase (Evidence Cache)

Supabase provides the persistent research evidence cache across pipeline runs, keyed by company domain (stores research signals, buyer enrichment data, and timestamps).

### Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `SUPABASE_URL` | _None_ | PostgREST API URL (e.g. `http://127.0.0.1:54321` locally). If empty, falls back to `NullCache` (in-memory no-op). |
| `SUPABASE_KEY` | _None_ | Supabase anon public API key. |
| `CACHE_ENABLED` | `1` | `1` to enable caching; `0` to disable. |
| `CACHE_TTL_DAYS` | `7` | Entry time-to-live in days before records are treated as stale and refreshed. |

### Local Setup

To run a local Supabase stack with Docker:

```bash
# Install Supabase CLI (macOS)
brew install supabase/tap/supabase

# Start local stack and run migrations (supabase/migrations/0001_evidence_cache.sql)
./scripts/supabase_local.sh
# or directly:
supabase start
```

Copy the printed **API URL** and **anon key** into `.env`:
```env
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<your-anon-key>
CACHE_ENABLED=1
CACHE_TTL_DAYS=7
```

To stop the local instance:
```bash
supabase stop
```

## Modes

- **Seed (default):** reads `data/prospects.json` (30 pre-enriched buyers). **0 Apollo
  credits.** Only the Outreach agent (LLM) and optional Tavily (free) are called.
- **Live:** set `LYZR_LIVE=1` in `.env` to allow the Apollo-backed Research agent.
  A hard guard raises if a live/Apollo path is hit without the flag.

## Flow

`load buyers → filter_prospects → [opt. Tavily signals] → score + rank → gate
→ Outreach agent → verify_citations → dashboard`

## Endpoints

- `POST /api/run` `{brief, mode, signals_mode}` → prospects, set-aside, tool events, metrics
- `POST /api/chat` `{message}` → runs a seed job on prospecting intent
- `POST /api/kb` `{query, top_k}` → Gong Playbook RAG retrieve
- `GET /api/config` → non-secret UI header info (masked key)
