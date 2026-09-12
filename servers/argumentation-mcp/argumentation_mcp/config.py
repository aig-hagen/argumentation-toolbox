"""Environment-driven configuration.

Backend URLs and credentials come from the environment so the same server binary
runs against a local backend, the bundled container, or a remote backend without
code changes. Logs go to stderr (see ``server``); nothing here is caller-visible.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

_ENV_PREFIX = "ARGUMENTATION_MCP_"

# Kept deliberately small (see docs/mcp-argumentation-service.md §12).
_DEFAULT_DUNG_URL = "http://localhost:8081/dung"
_DEFAULT_GRAPH_GEN_URL = "http://localhost:8082"
_DEFAULT_TIMEOUT_SECONDS = 30
_DEFAULT_MAX_REQUEST_BYTES = 1_048_576  # 1 MB, mirroring the Caddy limit
_DEFAULT_CALLER_ID = "argumentation-mcp"
_DEFAULT_HTTP_HOST = "127.0.0.1"
_DEFAULT_HTTP_PORT = 8083  # behind Caddy, which proxies /mcp (see docs §13)


@dataclass(frozen=True)
class Config:
    dung_url: str = _DEFAULT_DUNG_URL
    graph_gen_url: str = _DEFAULT_GRAPH_GEN_URL
    timeout_seconds: int = _DEFAULT_TIMEOUT_SECONDS
    max_request_bytes: int = _DEFAULT_MAX_REQUEST_BYTES
    # Identifier sent to the backend as its required caller field.
    caller_id: str = _DEFAULT_CALLER_ID
    # Graphviz executable used for rendering (Phase 2).
    graphviz_dot: str = "dot"
    # Streamable HTTP transport.
    http_host: str = _DEFAULT_HTTP_HOST
    http_port: int = _DEFAULT_HTTP_PORT
    stateless_http: bool = True
    # DNS-rebinding protection. Empty tuples fall back to the SDK's localhost
    # defaults; "*" disables protection (rely on the reverse proxy instead).
    allowed_hosts: tuple[str, ...] = ()
    allowed_origins: tuple[str, ...] = ()
    # Authorization for the HTTP transport. Auth turns on only when this server
    # has a public URL (resource_server_url) and at least one credential source:
    # a shared static token (Tier 1) or an OIDC issuer (Tier 2). See auth.py.
    resource_server_url: str = ""
    static_token: str = ""  # shared bearer token (Tier 1 auth)
    oauth_issuer: str = ""
    oauth_audience: str = ""  # defaults to resource_server_url
    oauth_jwks_url: str = ""  # optional; else discovered from the issuer
    oauth_algorithms: tuple[str, ...] = ("RS256", "ES256")
    required_scopes: tuple[str, ...] = ()

    def auth_enabled(self) -> bool:
        return bool(self.resource_server_url) and bool(self.oauth_issuer or self.static_token)

    def audience(self) -> str:
        return self.oauth_audience or self.resource_server_url


def _env(name: str, default: str) -> str:
    return os.environ.get(_ENV_PREFIX + name, default)


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(_ENV_PREFIX + name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        return default
    return value if value > 0 else default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(_ENV_PREFIX + name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _env_list(name: str) -> tuple[str, ...]:
    raw = os.environ.get(_ENV_PREFIX + name)
    if raw is None:
        return ()
    return tuple(item.strip() for item in raw.split(",") if item.strip())


def load_config() -> Config:
    return Config(
        dung_url=_env("DUNG_URL", _DEFAULT_DUNG_URL),
        graph_gen_url=_env("GRAPH_GEN_URL", _DEFAULT_GRAPH_GEN_URL),
        timeout_seconds=_env_int("TIMEOUT_SECONDS", _DEFAULT_TIMEOUT_SECONDS),
        max_request_bytes=_env_int("MAX_REQUEST_BYTES", _DEFAULT_MAX_REQUEST_BYTES),
        caller_id=_env("CALLER_ID", _DEFAULT_CALLER_ID),
        graphviz_dot=_env("GRAPHVIZ_DOT", "dot"),
        http_host=_env("HTTP_HOST", _DEFAULT_HTTP_HOST),
        http_port=_env_int("HTTP_PORT", _DEFAULT_HTTP_PORT),
        stateless_http=_env_bool("STATELESS", True),
        allowed_hosts=_env_list("ALLOWED_HOSTS"),
        allowed_origins=_env_list("ALLOWED_ORIGINS"),
        resource_server_url=_env("RESOURCE_SERVER_URL", ""),
        static_token=_env("STATIC_TOKEN", ""),
        oauth_issuer=_env("OAUTH_ISSUER", ""),
        oauth_audience=_env("OAUTH_AUDIENCE", ""),
        oauth_jwks_url=_env("OAUTH_JWKS_URL", ""),
        oauth_algorithms=_env_list("OAUTH_ALGORITHMS") or ("RS256", "ES256"),
        required_scopes=_env_list("REQUIRED_SCOPES"),
    )
