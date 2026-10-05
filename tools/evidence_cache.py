from __future__ import annotations

from datetime import datetime, timezone

import requests

_TIMEOUT = 10


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(value: str) -> datetime | None:
    if not value:
        return None
    v = value.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(v)
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


class NullCache:
    """No-op cache used when Supabase is unconfigured."""

    enabled = False

    def get(self, domain: str) -> dict | None:
        return None

    def put(self, domain: str, evidence: dict) -> None:
        return None

    def delete(self, domain: str) -> None:
        return None


class SupabaseCache:
    """EvidenceCache backed by a Supabase `evidence_cache` table via PostgREST."""

    enabled = True

    def __init__(self, url: str, key: str, ttl_days: int = 7,
                 table: str = "evidence_cache"):
        self.endpoint = f"{url.rstrip('/')}/rest/v1/{table}"
        self.ttl_days = ttl_days
        self._headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def _is_fresh(self, fetched_at: str) -> bool:
        dt = _parse_ts(fetched_at)
        if dt is None:
            return False
        return (_now() - dt).days < self.ttl_days

    def get(self, domain: str) -> dict | None:
        """Return the cached evidence for `domain` if younger than the TTL, else None.

        The returned dict carries `fetched_at` so the UI can show record age.
        """
        if not domain:
            return None
        try:
            resp = requests.get(
                self.endpoint,
                headers=self._headers,
                params={
                    "domain": f"eq.{domain}",
                    "select": "evidence,fetched_at",
                    "limit": "1",
                },
                timeout=_TIMEOUT,
            )
            if resp.status_code != 200:
                return None
            rows = resp.json()
        except (requests.RequestException, ValueError):
            return None
        if not rows:
            return None
        row = rows[0]
        if not self._is_fresh(row.get("fetched_at", "")):
            return None
        evidence = row.get("evidence") or {}
        evidence["fetched_at"] = row.get("fetched_at")
        return evidence

    def put(self, domain: str, evidence: dict) -> None:
        """Upsert evidence for `domain`, stamping `fetched_at` to now."""
        if not domain:
            return
        payload = {k: v for k, v in (evidence or {}).items() if k != "fetched_at"}
        body = {
            "domain": domain,
            "evidence": payload,
            "fetched_at": _now().isoformat(),
        }
        try:
            requests.post(
                self.endpoint,
                headers={**self._headers, "Prefer": "resolution=merge-duplicates"},
                params={"on_conflict": "domain"},
                json=body,
                timeout=_TIMEOUT,
            )
        except requests.RequestException:
            return

    def delete(self, domain: str) -> None:
        """Remove a domain from the cache (deletion-on-request)."""
        if not domain:
            return
        try:
            requests.delete(
                self.endpoint,
                headers=self._headers,
                params={"domain": f"eq.{domain}"},
                timeout=_TIMEOUT,
            )
        except requests.RequestException:
            return


def get_cache() -> NullCache | SupabaseCache:
    """Build the EvidenceCache from config; NullCache when Supabase is unset."""
    from app import config

    if config.CACHE_ENABLED and config.SUPABASE_URL and config.SUPABASE_KEY:
        return SupabaseCache(config.SUPABASE_URL, config.SUPABASE_KEY,
                             ttl_days=config.CACHE_TTL_DAYS)
    return NullCache()
