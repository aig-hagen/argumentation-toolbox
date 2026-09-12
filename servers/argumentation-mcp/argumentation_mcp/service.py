"""Transport-independent application services.

Tool handlers (stdio or Streamable HTTP) call these; nothing here depends on the
MCP wire format. Every failure is raised as a ``ServiceError``.
"""

from __future__ import annotations

import json

from argumentation_mcp import ENABLE_RENDER_FRAMEWORK, SCHEMA_VERSION, SERVICE_VERSION
from argumentation_mcp import render
from argumentation_mcp import semantics as sem
from argumentation_mcp.config import Config
from argumentation_mcp.contract import Framework, FrameworkInput, framework_from_input
from argumentation_mcp.dung import DungBackend
from argumentation_mcp.errors import ErrorCode, ServiceError
from argumentation_mcp.generation import GraphGenBackend
from argumentation_mcp.results import (
    AcceptanceQuery,
    AcceptanceResult,
    AttackOut,
    BackendStatus,
    CapabilitiesResult,
    ExtensionsResult,
    FrameworkOut,
    GenerationAlgorithmInfo,
    GenerationResult,
    Limits,
    MetaReasonerInfo,
    ReasonerParamInfo,
    RenderResult,
    SemanticsInfo,
)
from argumentation_mcp.text_parser import parse_framework_text

_VALID_MODES = ("credulous", "skeptical")


def resolve_framework(
    config: Config,
    framework: FrameworkInput | None,
    framework_text: str | None,
) -> Framework:
    """Accept exactly one of a structured or terse-text framework and validate it."""
    if (framework is None) == (framework_text is None):
        raise ServiceError(
            ErrorCode.INVALID_REQUEST,
            "Provide exactly one of 'framework' or 'framework_text'.",
        )

    if framework_text is not None:
        _enforce_size(config, framework_text.encode("utf-8"))
        return parse_framework_text(framework_text)

    assert framework is not None
    _enforce_size(config, json.dumps(framework.model_dump()).encode("utf-8"))
    return framework_from_input(framework)


def _enforce_size(config: Config, payload: bytes) -> None:
    if len(payload) > config.max_request_bytes:
        raise ServiceError(
            ErrorCode.REQUEST_TOO_LARGE,
            f"Framework input exceeds the {config.max_request_bytes}-byte limit.",
        )


async def enumerate_extensions(
    config: Config,
    backend: DungBackend,
    *,
    framework: FrameworkInput | None,
    framework_text: str | None,
    semantics: str,
    args: dict[str, str] | None,
) -> ExtensionsResult:
    resolved = resolve_framework(config, framework, framework_text)
    backend_args = sem.validate_and_default_args(semantics, dict(args or {}))
    elapsed, extensions = await backend.enumerate_extensions(resolved, semantics, backend_args)
    return ExtensionsResult(
        schema_version=SCHEMA_VERSION,
        service_version=SERVICE_VERSION,
        semantics=semantics,
        extensions=extensions,
        solver_time_ms=round(elapsed),
    )


async def check_acceptance(
    config: Config,
    backend: DungBackend,
    *,
    framework: FrameworkInput | None,
    framework_text: str | None,
    semantics: str,
    mode: str,
    argument: str | None,
    args: dict[str, str] | None,
) -> AcceptanceResult:
    if mode not in _VALID_MODES:
        raise ServiceError(
            ErrorCode.INVALID_REQUEST,
            f"Invalid mode {mode!r}. Expected one of {list(_VALID_MODES)}.",
        )
    resolved = resolve_framework(config, framework, framework_text)
    if argument is not None and argument not in resolved.names:
        raise ServiceError(
            ErrorCode.INVALID_FRAMEWORK,
            f"Queried argument {argument!r} is not in the framework.",
        )
    backend_args = sem.validate_and_default_args(semantics, dict(args or {}))
    elapsed, accepted = await backend.acceptance(mode, resolved, semantics, backend_args)

    query = None
    if argument is not None:
        query = AcceptanceQuery(argument=argument, accepted=argument in accepted)

    return AcceptanceResult(
        schema_version=SCHEMA_VERSION,
        service_version=SERVICE_VERSION,
        semantics=semantics,
        mode=mode,
        accepted_arguments=accepted,
        query=query,
        solver_time_ms=round(elapsed),
    )


def _framework_out(framework: Framework) -> FrameworkOut:
    return FrameworkOut(
        arguments=list(framework.names),
        attacks=[AttackOut(source=s, target=t) for s, t in framework.attacks],
    )


async def render_framework(
    config: Config,
    *,
    framework: FrameworkInput | None,
    framework_text: str | None,
    highlight_arguments: list[str] | None,
) -> tuple[bytes, RenderResult]:
    resolved = resolve_framework(config, framework, framework_text)
    highlight = set(highlight_arguments or [])
    unknown = sorted(highlight - set(resolved.names))
    if unknown:
        raise ServiceError(
            ErrorCode.INVALID_FRAMEWORK,
            f"highlight_arguments not in the framework: {unknown}.",
        )
    png = render.render_png(config, resolved, highlight)
    result = RenderResult(
        schema_version=SCHEMA_VERSION,
        service_version=SERVICE_VERSION,
        format="png",
        nr_of_arguments=resolved.nr_of_arguments,
        nr_of_attacks=len(resolved.attacks),
        highlighted_arguments=sorted(highlight),
        byte_size=len(png),
    )
    return png, result


async def generate_framework(
    config: Config,
    graphgen: GraphGenBackend,
    *,
    algorithm: str,
    params: dict | None,
    seed: int | None,
) -> GenerationResult:
    framework = await graphgen.generate(algorithm, dict(params or {}), seed)
    return GenerationResult(
        schema_version=SCHEMA_VERSION,
        service_version=SERVICE_VERSION,
        algorithm=algorithm,
        seed=seed,
        framework=_framework_out(framework),
        nr_of_arguments=framework.nr_of_arguments,
        nr_of_attacks=len(framework.attacks),
    )


async def get_capabilities(
    config: Config, backend: DungBackend, graphgen: GraphGenBackend
) -> CapabilitiesResult:
    reasoning_available = await backend.is_available()

    generation_algorithms: list[GenerationAlgorithmInfo] = []
    generation_available = False
    try:
        algorithms = await graphgen.list_algorithms()
        generation_available = True
        generation_algorithms = [
            GenerationAlgorithmInfo(
                id=str(algo.get("id", "")),
                description=str(algo.get("description", "")),
                params=list(algo.get("params", [])),
                available=bool(algo.get("available", False)),
            )
            for algo in algorithms
        ]
    except ServiceError:
        pass  # generation backend down: report unavailable rather than failing

    return CapabilitiesResult(
        schema_version=SCHEMA_VERSION,
        service_version=SERVICE_VERSION,
        semantics=[SemanticsInfo(key=s.key, display_name=s.display_name, group=s.group) for s in sem.SEMANTICS],
        meta_reasoners=[
            MetaReasonerInfo(
                key=m.key,
                display_name=m.display_name,
                parameters=[
                    ReasonerParamInfo(
                        key=p.key,
                        label=p.label,
                        description=p.description,
                        allowed_values=list(p.allowed_values()),
                        default=p.resolved_default(),
                    )
                    for p in m.parameters
                ],
            )
            for m in sem.META_REASONERS
        ],
        operations=[
            "enumerate_extensions",
            "check_acceptance",
            *(["render_framework"] if ENABLE_RENDER_FRAMEWORK else []),
            "generate_framework",
        ],
        generation_algorithms=generation_algorithms,
        backends=BackendStatus(
            reasoning=reasoning_available,
            rendering=render.is_available(config),
            generation=generation_available,
        ),
        limits=Limits(
            timeout_seconds=config.timeout_seconds,
            max_request_bytes=config.max_request_bytes,
        ),
    )
