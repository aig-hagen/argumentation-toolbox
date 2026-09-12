"""Adapter around the TweetyProject ``/dung`` web service.

Owns backend payload construction, response parsing, and validation. The backend
speaks in one-based argument indices and returns set/list-of-sets strings; the
raw ``answer`` string is never passed through to MCP clients.
"""

from __future__ import annotations

import re

import httpx

from argumentation_mcp.config import Config
from argumentation_mcp.contract import Framework
from argumentation_mcp.errors import ErrorCode, ServiceError

_TIMEOUT_UNIT = "ms"
_HTTP_TIMEOUT_STATUSES = {408, 504, 524}
_HTTP_UNAVAILABLE_STATUSES = {429, 502, 503}

_INT_RE = re.compile(r"-?\d+")


def parse_set(answer: str) -> list[int]:
    """Parse a backend set string like ``{1,3}`` or ``{}`` into a list of ints."""
    text = answer.strip()
    if not (text.startswith("{") and text.endswith("}")):
        raise ServiceError(
            ErrorCode.MALFORMED_BACKEND_RESPONSE,
            "Backend returned a malformed set.",
        )
    return _parse_int_set(text)


def parse_list_of_sets(answer: str) -> list[list[int]]:
    """Parse ``[{2},{1,3}]`` / ``[]`` / ``[{}]`` into a list of int lists."""
    text = answer.strip()
    if not (text.startswith("[") and text.endswith("]")):
        raise ServiceError(
            ErrorCode.MALFORMED_BACKEND_RESPONSE,
            "Backend returned a malformed list of extensions.",
        )
    inner = text[1:-1].strip()
    if inner == "":
        return []
    sets: list[list[int]] = []
    for chunk in re.findall(r"\{[^}]*\}", inner):
        sets.append(_parse_int_set(chunk))
    # A non-empty body that yielded no braces is malformed (e.g. stray text).
    if not sets:
        raise ServiceError(
            ErrorCode.MALFORMED_BACKEND_RESPONSE,
            "Backend returned a malformed list of extensions.",
        )
    return sets


def _parse_int_set(chunk: str) -> list[int]:
    body = chunk.strip().lstrip("{").rstrip("}").strip()
    if body == "":
        return []
    values: list[int] = []
    for part in body.split(","):
        match = _INT_RE.fullmatch(part.strip())
        if match is None:
            raise ServiceError(
                ErrorCode.MALFORMED_BACKEND_RESPONSE,
                "Backend returned a non-integer argument index.",
            )
        values.append(int(match.group()))
    return values


class DungBackend:
    """Async client for the reasoning backend. One instance per server process."""

    def __init__(self, config: Config, client: httpx.AsyncClient | None = None):
        self._config = config
        # A small buffer over the reasoning timeout so the backend can answer TIMEOUT
        # itself rather than the socket being cut first.
        self._client = client or httpx.AsyncClient(timeout=config.timeout_seconds + 5)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _post(self, cmd: str, framework: Framework, semantics: str, args: dict[str, str]) -> tuple[float, str]:
        body = {
            "email": self._config.caller_id,
            "cmd": cmd,
            "nr_of_arguments": framework.nr_of_arguments,
            "attacks": framework.indexed_attacks(),
            "semantics": semantics,
            "args": args,
            "timeout": self._config.timeout_seconds * 1000,
            "unit_timeout": _TIMEOUT_UNIT,
        }
        try:
            response = await self._client.post(self._config.dung_url, json=body)
        except httpx.TimeoutException as exc:
            raise ServiceError(ErrorCode.BACKEND_TIMEOUT, "Reasoning exceeded the configured timeout.") from exc
        except httpx.HTTPError as exc:
            raise ServiceError(ErrorCode.BACKEND_UNAVAILABLE, "The reasoning backend is unavailable.") from exc

        if response.status_code in _HTTP_TIMEOUT_STATUSES:
            raise ServiceError(ErrorCode.BACKEND_TIMEOUT, "Reasoning exceeded the configured timeout.")
        if response.status_code in _HTTP_UNAVAILABLE_STATUSES:
            raise ServiceError(ErrorCode.BACKEND_UNAVAILABLE, "The reasoning backend is unavailable.")
        if response.status_code >= 400:
            raise ServiceError(
                ErrorCode.MALFORMED_BACKEND_RESPONSE,
                f"The reasoning backend returned an unexpected status ({response.status_code}).",
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise ServiceError(ErrorCode.MALFORMED_BACKEND_RESPONSE, "The reasoning backend returned invalid JSON.") from exc

        status = payload.get("status")
        answer = payload.get("answer")
        elapsed = payload.get("time")
        if status == "TIMEOUT":
            raise ServiceError(ErrorCode.BACKEND_TIMEOUT, "Reasoning exceeded the configured timeout.")
        if answer is None or not isinstance(answer, str):
            raise ServiceError(ErrorCode.MALFORMED_BACKEND_RESPONSE, "The reasoning backend returned no answer.")
        return (float(elapsed) if isinstance(elapsed, (int, float)) else 0.0, answer)

    async def enumerate_extensions(
        self, framework: Framework, semantics: str, args: dict[str, str]
    ) -> tuple[float, list[list[str]]]:
        elapsed, answer = await self._post("get_models", framework, semantics, args)
        raw = parse_list_of_sets(answer)
        extensions = [[framework.name_for_index(i) for i in ext] for ext in raw]
        return elapsed, extensions

    async def acceptance(
        self, mode: str, framework: Framework, semantics: str, args: dict[str, str]
    ) -> tuple[float, list[str]]:
        cmd = "get_credulous" if mode == "credulous" else "get_skeptical"
        elapsed, answer = await self._post(cmd, framework, semantics, args)
        raw = parse_set(answer)
        return elapsed, [framework.name_for_index(i) for i in raw]

    async def is_available(self) -> bool:
        """Best-effort reachability probe using a trivial grounded query."""
        probe = Framework(names=("a",), attacks=())
        try:
            await self._post("get_models", probe, "GR", {})
        except ServiceError as exc:
            return exc.code not in (ErrorCode.BACKEND_UNAVAILABLE, ErrorCode.BACKEND_TIMEOUT)
        return True
