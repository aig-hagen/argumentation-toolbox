"""Structured result models advertised as each tool's output schema."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ExtensionsResult(BaseModel):
    schema_version: str
    service_version: str
    semantics: str
    extensions: list[list[str]] = Field(description="Extensions as lists of argument names.")
    solver_time_ms: int


class AcceptanceQuery(BaseModel):
    argument: str
    accepted: bool


class AcceptanceResult(BaseModel):
    schema_version: str
    service_version: str
    semantics: str
    mode: str = Field(description="'credulous' or 'skeptical'.")
    accepted_arguments: list[str] = Field(description="Complete accepted set returned by the backend.")
    query: AcceptanceQuery | None = Field(
        default=None,
        description="Present only when an argument was queried; its acceptance under the set.",
    )
    solver_time_ms: int


class SemanticsInfo(BaseModel):
    key: str
    display_name: str
    group: str


class ReasonerParamInfo(BaseModel):
    key: str
    label: str
    description: str
    allowed_values: list[str]
    default: str


class MetaReasonerInfo(BaseModel):
    key: str
    display_name: str
    parameters: list[ReasonerParamInfo]


class BackendStatus(BaseModel):
    reasoning: bool
    rendering: bool
    generation: bool


class Limits(BaseModel):
    timeout_seconds: int
    max_request_bytes: int


class CapabilitiesResult(BaseModel):
    schema_version: str
    service_version: str
    semantics: list[SemanticsInfo]
    meta_reasoners: list[MetaReasonerInfo]
    operations: list[str]
    backends: BackendStatus
    limits: Limits
