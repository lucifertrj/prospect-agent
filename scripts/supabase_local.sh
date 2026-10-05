#!/usr/bin/env bash
# Start a local Supabase stack and apply the evidence_cache migration.
# Needs Docker running and the Supabase CLI (https://supabase.com/docs/guides/cli).
#   macOS: brew install supabase/tap/supabase
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install it:  brew install supabase/tap/supabase" >&2
  exit 1
fi

# `supabase start` boots Postgres + PostgREST and applies supabase/migrations/*.
supabase start

echo
echo "Copy the printed 'API URL' and 'anon key' into .env as:"
echo "  SUPABASE_URL=<API URL>     (e.g. http://127.0.0.1:54321)"
echo "  SUPABASE_KEY=<anon key>"
echo
echo "Then run the pipeline with signals_mode='tavily' to exercise the cache."
echo "Stop later with:  supabase stop"
