"""Adapter around the graph-gen ``/generate`` service (abstract frameworks only).

Discovers available algorithms and their parameter schemas from ``/algorithms``
and turns a ``/generate`` result into the canonical framework contract, naming
the generated 1-based arguments deterministically (``a1``..``aN``).
"""

from __future__ import annotations

import httpx

from argumentation_mcp.config import Config
from argumentation_mcp.contract import Framework, validate_framework
from argumentation_mcp.errors import ErrorCode, ServiceError


def argument_name(index: int) -> str:
    return f"a{index}"


class GraphGenBackend:
    """Async client for the generation backend."""

    def __init__(self, config: Config, client: httpx.AsyncClient | None = None):
        self._config = config
        self._base = config.graph_gen_url.rstrip("/")
        self._client = client or httpx.AsyncClient(timeout=config.timeout_seconds + 5)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def list_algorithms(self) -> list[dict]:
        try:
            response = await self._client.get(f"{self._base}/algorithms")
            response.raise_for_status()
            data = response.json()
        except httpx.HTTPError as exc:
            raise ServiceError(ErrorCode.BACKEND_UNAVAILABLE, "The generation backend is unavailable.") from exc
        except ValueError as exc:
            raise ServiceError(ErrorCode.GENERATION_FAILED, "The generation backend returned invalid JSON.") from exc
        if not isinstance(data, list):
            raise ServiceError(ErrorCode.GENERATION_FAILED, "The generation backend returned an unexpected shape.")
        return data

    async def is_available(self) -> bool:
        try:
            await self.list_algorithms()
        except ServiceError:
            return False
        return True

    async def generate(self, algorithm: str, params: dict, seed: int | None) -> Framework:
        payload_params = dict(params)
        if seed is not None:
            payload_params["seed"] = seed
        body = {
            "algorithm": algorithm,
            "params": payload_params,
            "framework_type": "abstract",
            "timeout": self._config.timeout_seconds,
        }
        try:
            response = await self._client.post(f"{self._base}/generate", json=body)
        except httpx.TimeoutException as exc:
            raise ServiceError(ErrorCode.BACKEND_TIMEOUT, "Generation exceeded the configured timeout.") from exc
        except httpx.HTTPError as exc:
            raise ServiceError(ErrorCode.BACKEND_UNAVAILABLE, "The generation backend is unavailable.") from exc

        if response.status_code == 400:
            raise ServiceError(ErrorCode.GENERATION_FAILED, _detail(response, "Invalid generation request."))
        if response.status_code in (408, 504, 524):
            raise ServiceError(ErrorCode.BACKEND_TIMEOUT, "Generation exceeded the configured timeout.")
        if response.status_code in (429, 502, 503):
            raise ServiceError(ErrorCode.BACKEND_UNAVAILABLE, "The generation backend is unavailable.")
        if response.status_code >= 400:
            raise ServiceError(ErrorCode.GENERATION_FAILED, "Generation failed.")

        try:
            data = response.json()
            count = int(data["nr_of_arguments"])
            raw_attacks = data["attacks"]
        except (ValueError, KeyError, TypeError) as exc:
            raise ServiceError(ErrorCode.GENERATION_FAILED, "The generation backend returned an unexpected shape.") from exc

        names = [argument_name(i) for i in range(1, count + 1)]
        try:
            attacks = [(argument_name(int(s)), argument_name(int(t))) for s, t in raw_attacks]
        except (ValueError, TypeError) as exc:
            raise ServiceError(ErrorCode.GENERATION_FAILED, "The generation backend returned malformed attacks.") from exc
        return validate_framework(names, attacks)


def _detail(response: httpx.Response, fallback: str) -> str:
    try:
        detail = response.json().get("detail")
    except ValueError:
        detail = None
    return str(detail) if detail else fallback
