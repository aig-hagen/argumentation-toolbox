from __future__ import annotations

from starlette.testclient import TestClient

from argumentation_mcp.config import Config
from argumentation_mcp.server import build_server
from tests.conftest import answer, make_backend, make_graphgen

_RESOURCE = "https://agon.test/mcp"


def _app(dev_token="devtoken"):
    # Disable DNS-rebinding checks so TestClient's Host header is accepted.
    cfg = Config(
        dung_url="http://backend.test/dung",
        resource_server_url=_RESOURCE,
        dev_token=dev_token,
        allowed_hosts=("*",),
    )
    backend = make_backend(cfg, lambda body: answer("[]"))
    server = build_server(cfg, backend, make_graphgen(cfg))
    from argumentation_mcp.http import build_transport_security

    return server.streamable_http_app(
        streamable_http_path="/mcp",
        stateless_http=True,
        transport_security=build_transport_security(cfg),
    )


def test_protected_resource_metadata_served():
    with TestClient(_app()) as client:
        meta = client.get("/.well-known/oauth-protected-resource/mcp")
        assert meta.status_code == 200
        body = meta.json()
        assert body["resource"].rstrip("/") == _RESOURCE
        assert body["authorization_servers"]


def test_unauthenticated_mcp_is_challenged():
    with TestClient(_app()) as client:
        resp = client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
            headers={"Accept": "application/json, text/event-stream"},
        )
        assert resp.status_code == 401
        assert "WWW-Authenticate" in resp.headers


def test_dev_token_passes_auth():
    with TestClient(_app()) as client:
        resp = client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
            headers={
                "Accept": "application/json, text/event-stream",
                "Content-Type": "application/json",
                "Authorization": "Bearer devtoken",
            },
        )
        # Past the auth gate: anything but a 401 challenge.
        assert resp.status_code != 401
