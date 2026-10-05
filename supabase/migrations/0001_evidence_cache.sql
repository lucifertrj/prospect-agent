-- Evidence cache (PRD §17.a): 7-day account cache across runs, keyed by domain.
-- Stores research evidence (Tavily signals, enriched buyer records, email status)
-- as JSON with a fetched_at stamp. TTL is enforced in app code, not here.

create table if not exists public.evidence_cache (
    domain      text primary key,
    evidence    jsonb       not null default '{}'::jsonb,
    fetched_at  timestamptz not null default now()
);

-- Freshness lookups filter on fetched_at.
create index if not exists evidence_cache_fetched_at_idx
    on public.evidence_cache (fetched_at);

comment on table public.evidence_cache is
    'Per-domain research cache. Rows older than the app TTL (default 7 days) are ignored and overwritten on the next miss.';
