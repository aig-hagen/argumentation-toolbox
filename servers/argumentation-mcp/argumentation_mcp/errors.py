"""Stable, structured error contract shared by every tool."""

from __future__ import annotations

from enum import Enum


class ErrorCode(str, Enum):
    """Stable error codes. Values are part of the public contract."""

    INVALID_REQUEST = "INVALID_REQUEST"
    INVALID_FRAMEWORK = "INVALID_FRAMEWORK"
    UNSUPPORTED_SEMANTICS = "UNSUPPORTED_SEMANTICS"
    INVALID_REASONER_PARAMS = "INVALID_REASONER_PARAMS"
    REQUEST_TOO_LARGE = "REQUEST_TOO_LARGE"
    BACKEND_TIMEOUT = "BACKEND_TIMEOUT"
    BACKEND_UNAVAILABLE = "BACKEND_UNAVAILABLE"
    MALFORMED_BACKEND_RESPONSE = "MALFORMED_BACKEND_RESPONSE"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# Codes worth a client retry (transient conditions).
_RETRYABLE = {
    ErrorCode.BACKEND_TIMEOUT,
    ErrorCode.BACKEND_UNAVAILABLE,
}


class ServiceError(Exception):
    """A tool-execution failure carrying a stable, client-safe error payload.

    The message must never leak internal URLs, stack traces, or backend stderr.
    """

    def __init__(self, code: ErrorCode, message: str, *, retryable: bool | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = _RETRYABLE.__contains__(code) if retryable is None else retryable

    def to_payload(self) -> dict[str, object]:
        return {"code": self.code.value, "message": self.message, "retryable": self.retryable}
