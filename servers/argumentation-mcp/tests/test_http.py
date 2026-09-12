from __future__ import annotations

import httpx
from starlette.testclient import TestClient

from argumentation_mcp.config import Config
from argumentation_mcp.http import build_transport_security, register_health_routes
from argumentation_mcp.server import build_server
from tests.conftest import answer, make_backend


def _config(**kw) -> Config:
    base = dict(dung_url="http://backend.test/dung", timeout_seconds=5, max_request_bytes=4096)
    base.update(kw)
    return Config(**base)


def test_transport_security_defaults_to_none():
    assert build_transport_security(_config()) is None


def test_transport_security_wildcard_disables_protection():
    settings = build_transport_security(_config(allowed_hosts=("*",)))
    assert settings is not None
    assert settings.enable_dns_rebinding_protection is False


def test_transport_security_explicit_hosts():
    settings = build_transport_security(
        _config(allowed_hosts=("agon.example",), allowed_origins=("https://agon.example",))
    )
    assert settings is not None
    assert settings.enable_dns_rebinding_protection is True
    assert settings.allowed_hosts == ["agon.example"]


def _app_with_health(handler):
    cfg = _config()
    backend = make_backend(cfg, handler)
    server = build_server(cfg, backend)
    register_health_routes(server, backend)
    app = server.streamable_http_app(streamable_http_path="/mcp", stateless_http=True)
    return app


def test_mcp_and_health_routes_registered():
    app = _app_with_health(lambda body: answer("[]"))
    paths = {getattr(r, "path", None) for r in app.routes}
    assert "/healthz" in paths and "/readyz" in paths
    assert any("/mcp" in (getattr(r, "path", "") or "") for r in app.routes)


def test_healthz_and_readyz():
    with TestClient(_app_with_health(lambda body: answer("[{1}]"))) as client:
        assert client.get("/healthz").json() == {"status": "ok"}
        ready = client.get("/readyz")
        assert ready.status_code == 200
        assert ready.json()["reasoning_backend"] is True


def test_readyz_reports_unavailable():
    with TestClient(_app_with_health(lambda body: httpx.Response(503))) as client:
        ready = client.get("/readyz")
        assert ready.status_code == 503
        assert ready.json()["reasoning_backend"] is False
