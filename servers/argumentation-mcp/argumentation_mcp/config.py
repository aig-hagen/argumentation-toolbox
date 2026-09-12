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


@dataclass(frozen=True)
class Config:
    dung_url: str = _DEFAULT_DUNG_URL
    graph_gen_url: str = _DEFAULT_GRAPH_GEN_URL
    timeout_seconds: int = _DEFAULT_TIMEOUT_SECONDS
    max_request_bytes: int = _DEFAULT_MAX_REQUEST_BYTES
    # Identifier sent to the backend as its required caller field.
    caller_id: str = _DEFAULT_CALLER_ID


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


def load_config() -> Config:
    return Config(
        dung_url=_env("DUNG_URL", _DEFAULT_DUNG_URL),
        graph_gen_url=_env("GRAPH_GEN_URL", _DEFAULT_GRAPH_GEN_URL),
        timeout_seconds=_env_int("TIMEOUT_SECONDS", _DEFAULT_TIMEOUT_SECONDS),
        max_request_bytes=_env_int("MAX_REQUEST_BYTES", _DEFAULT_MAX_REQUEST_BYTES),
        caller_id=_env("CALLER_ID", _DEFAULT_CALLER_ID),
    )
