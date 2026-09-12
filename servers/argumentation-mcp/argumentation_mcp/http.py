"""Streamable HTTP transport, served from the same core as stdio.

The MCP endpoint lives at ``/mcp``; ``/healthz`` (liveness) and ``/readyz``
(readiness, including a backend probe) support container orchestration. Requests
are stateless by default while the SDK retains compatibility with legacy
initialized clients. HTTPS and authorization terminate at the reverse proxy
(see docs §11/§13); this process binds to localhost.
"""

from __future__ import annotations

from mcp.server.mcpserver import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from starlette.requests import Request
from starlette.responses import JSONResponse

from argumentation_mcp.config import Config
from argumentation_mcp.dung import DungBackend


def build_transport_security(config: Config) -> TransportSecuritySettings | None:
    """Configure the SDK's Host/Origin (DNS-rebinding) checks.

    Returns ``None`` to keep the SDK's localhost defaults. A literal ``*`` in
    ``allowed_hosts`` disables the check entirely, for deployments that trust an
    upstream reverse proxy to validate the Host header.
    """
    if not config.allowed_hosts and not config.allowed_origins:
        return None
    if "*" in config.allowed_hosts:
        return TransportSecuritySettings(
            enable_dns_rebinding_protection=False,
            allowed_hosts=[],
            allowed_origins=list(config.allowed_origins),
        )
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=list(config.allowed_hosts),
        allowed_origins=list(config.allowed_origins),
    )


def register_health_routes(server: MCPServer, backend: DungBackend) -> None:
    async def healthz(_request: Request) -> JSONResponse:
        return JSONResponse({"status": "ok"})

    async def readyz(_request: Request) -> JSONResponse:
        ready = await backend.is_available()
        return JSONResponse(
            {"status": "ready" if ready else "unavailable", "reasoning_backend": ready},
            status_code=200 if ready else 503,
        )

    server.custom_route("/healthz", methods=["GET"])(healthz)
    server.custom_route("/readyz", methods=["GET"])(readyz)


async def run_streamable_http(config: Config, server: MCPServer) -> None:
    await server.run_streamable_http_async(
        host=config.http_host,
        port=config.http_port,
        streamable_http_path="/mcp",
        stateless_http=config.stateless_http,
        max_request_body_size=config.max_request_bytes,
        transport_security=build_transport_security(config),
    )
