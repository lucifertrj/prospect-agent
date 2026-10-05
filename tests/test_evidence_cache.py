"""tests/test_evidence_cache.py: EvidenceCache (PRD §17.a).

Covers the TTL freshness logic, the get/put round-trip, deletion, and the
NullCache fallback — all without a live Supabase (PostgREST calls are stubbed).
"""
from datetime import timedelta

from tools import evidence_cache as ec


def _iso(dt):
    return dt.isoformat()


class FakeResp:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else []

    def json(self):
        return self._payload


def _cache(ttl_days=7):
    return ec.SupabaseCache("http://localhost:54321", "anon-key", ttl_days=ttl_days)


def test_null_cache_is_inert():
    c = ec.NullCache()
    assert c.enabled is False
    assert c.get("acme.com") is None
    assert c.put("acme.com", {"signals": [1]}) is None
    assert c.delete("acme.com") is None


def test_fresh_hit_returned_with_fetched_at(monkeypatch):
    fetched = _iso(ec._now() - timedelta(days=2))
    monkeypatch.setattr(ec.requests, "get", lambda *a, **k: FakeResp(
        200, [{"evidence": {"signals": [{"id": "s1"}]}, "fetched_at": fetched}]))
    out = _cache().get("acme.com")
    assert out["signals"] == [{"id": "s1"}]
    assert out["fetched_at"] == fetched


def test_stale_hit_is_a_miss(monkeypatch):
    fetched = _iso(ec._now() - timedelta(days=8))
    monkeypatch.setattr(ec.requests, "get", lambda *a, **k: FakeResp(
        200, [{"evidence": {"signals": []}, "fetched_at": fetched}]))
    assert _cache(ttl_days=7).get("acme.com") is None


def test_empty_result_is_a_miss(monkeypatch):
    monkeypatch.setattr(ec.requests, "get", lambda *a, **k: FakeResp(200, []))
    assert _cache().get("acme.com") is None


def test_blank_domain_short_circuits():
    c = _cache()
    assert c.get("") is None  # no network call needed


def test_put_upserts_on_domain(monkeypatch):
    captured = {}

    def fake_post(url, headers=None, params=None, json=None, timeout=None):
        captured["params"] = params
        captured["headers"] = headers
        captured["body"] = json
        return FakeResp(201)

    monkeypatch.setattr(ec.requests, "post", fake_post)
    _cache().put("acme.com", {"signals": [1], "fetched_at": "ignore-me"})
    assert captured["params"] == {"on_conflict": "domain"}
    assert "merge-duplicates" in captured["headers"]["Prefer"]
    assert captured["body"]["domain"] == "acme.com"
    assert captured["body"]["evidence"] == {"signals": [1]}  # stale stamp stripped
    assert "fetched_at" in captured["body"]


def test_network_error_degrades_to_miss(monkeypatch):
    def boom(*a, **k):
        raise ec.requests.RequestException("down")

    monkeypatch.setattr(ec.requests, "get", boom)
    assert _cache().get("acme.com") is None


def test_get_cache_returns_null_without_config(monkeypatch):
    from app import config
    monkeypatch.setattr(config, "SUPABASE_URL", "", raising=False)
    monkeypatch.setattr(config, "SUPABASE_KEY", "", raising=False)
    assert isinstance(ec.get_cache(), ec.NullCache)


def test_get_cache_returns_supabase_when_configured(monkeypatch):
    from app import config
    monkeypatch.setattr(config, "CACHE_ENABLED", True, raising=False)
    monkeypatch.setattr(config, "SUPABASE_URL", "http://localhost:54321", raising=False)
    monkeypatch.setattr(config, "SUPABASE_KEY", "anon-key", raising=False)
    monkeypatch.setattr(config, "CACHE_TTL_DAYS", 7, raising=False)
    assert isinstance(ec.get_cache(), ec.SupabaseCache)
