"""MCP server: tool definitions plus the stdio entrypoint.

The tools are thin adapters over :mod:`argumentation_mcp.service`; the same core
will back the Streamable HTTP transport in a later phase. Every tool is
read-only and returns validated structured content plus a compact text fallback.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from typing import Annotated

from mcp.server.mcpserver import MCPServer
from mcp.types import CallToolResult, TextContent, ToolAnnotations
from pydantic import BaseModel, Field

from argumentation_mcp import SERVER_NAME, SERVICE_VERSION
from argumentation_mcp import service
from argumentation_mcp.config import Config, load_config
from argumentation_mcp.contract import FrameworkInput
from argumentation_mcp.dung import DungBackend
from argumentation_mcp.errors import ErrorCode, ServiceError
from argumentation_mcp.results import AcceptanceResult, CapabilitiesResult, ExtensionsResult

logger = logging.getLogger(__name__)

_INSTRUCTIONS = (
    "Abstract argumentation reasoning over Dung frameworks. Provide a framework as "
    "structured JSON (`framework`) or terse text (`framework_text`, one item per line: "
    "`a` declares an argument, `a -> b` or `a b` an attack). Call `get_capabilities` for "
    "the supported semantics keys and meta-reasoner parameters before choosing a semantics."
)

_READ_ONLY = ToolAnnotations(read_only_hint=True, idempotent_hint=True, open_world_hint=False)

_FrameworkArg = Annotated[
    FrameworkInput | None,
    Field(default=None, description="Structured framework. Mutually exclusive with framework_text."),
]
_FrameworkTextArg = Annotated[
    str | None,
    Field(default=None, description="Terse text framework. Mutually exclusive with framework."),
]
_SemanticsArg = Annotated[str, Field(description="Semantics/meta-reasoner key, e.g. PR, ST, GR.")]
_ArgsArg = Annotated[
    dict[str, str] | None,
    Field(default=None, description="Optional meta-reasoner parameters (see get_capabilities)."),
]


def _error(exc: ServiceError) -> CallToolResult:
    return CallToolResult(
        content=[TextContent(type="text", text=json.dumps(exc.to_payload()))],
        is_error=True,
    )


def _ok(model: BaseModel, text: str) -> CallToolResult:
    return CallToolResult(
        content=[TextContent(type="text", text=text)],
        structured_content=model.model_dump(mode="json"),
    )


def _internal_error() -> CallToolResult:
    return _error(ServiceError(ErrorCode.INTERNAL_ERROR, "The service encountered an internal error."))


def _format_set(names: list[str]) -> str:
    return "{" + ", ".join(names) + "}"


def _format_extensions(result: ExtensionsResult) -> str:
    if not result.extensions:
        return f"{result.semantics}: no extensions."
    sets = ", ".join(_format_set(ext) for ext in result.extensions)
    count = len(result.extensions)
    return f"{result.semantics}: {count} extension{'s' if count != 1 else ''}: {sets}"


def _format_acceptance(result: AcceptanceResult) -> str:
    accepted = _format_set(result.accepted_arguments)
    line = f"{result.mode} / {result.semantics} accepted: {accepted}"
    if result.query is not None:
        verdict = "accepted" if result.query.accepted else "not accepted"
        line += f"; {result.query.argument}: {verdict}"
    return line


def _format_capabilities(result: CapabilitiesResult) -> str:
    reasoning = "up" if result.backends.reasoning else "down"
    return (
        f"{SERVER_NAME} v{SERVICE_VERSION}: {len(result.semantics)} semantics, "
        f"{len(result.meta_reasoners)} meta-reasoners; reasoning backend {reasoning}."
    )


def build_server(config: Config, backend: DungBackend) -> MCPServer:
    from argumentation_mcp.auth import build_auth

    token_verifier, auth_settings = build_auth(config)
    server = MCPServer(
        name=SERVER_NAME,
        version=SERVICE_VERSION,
        instructions=_INSTRUCTIONS,
        token_verifier=token_verifier,
        auth=auth_settings,
    )

    @server.tool(annotations=_READ_ONLY, structured_output=True,
                 description="List supported semantics, meta-reasoner parameters, operations, "
                             "backend availability, and configured limits.")
    async def get_capabilities() -> CapabilitiesResult:  # type: ignore[return-value]
        try:
            result = await service.get_capabilities(config, backend)
            return _ok(result, _format_capabilities(result))  # type: ignore[return-value]
        except ServiceError as exc:
            return _error(exc)  # type: ignore[return-value]
        except Exception:
            logger.exception("get_capabilities failed")
            return _internal_error()  # type: ignore[return-value]

    @server.tool(annotations=_READ_ONLY, structured_output=True,
                 description="Enumerate every extension of a framework under a semantics.")
    async def enumerate_extensions(
        framework: _FrameworkArg = None,
        framework_text: _FrameworkTextArg = None,
        semantics: _SemanticsArg = "PR",
        args: _ArgsArg = None,
    ) -> ExtensionsResult:  # type: ignore[return-value]
        try:
            result = await service.enumerate_extensions(
                config, backend,
                framework=framework, framework_text=framework_text,
                semantics=semantics, args=args,
            )
            return _ok(result, _format_extensions(result))  # type: ignore[return-value]
        except ServiceError as exc:
            return _error(exc)  # type: ignore[return-value]
        except Exception:
            logger.exception("enumerate_extensions failed")
            return _internal_error()  # type: ignore[return-value]

    @server.tool(annotations=_READ_ONLY, structured_output=True,
                 description="Check credulous or skeptical acceptance under a semantics.")
    async def check_acceptance(
        semantics: _SemanticsArg = "PR",
        mode: Annotated[str, Field(description="'credulous' or 'skeptical'.")] = "credulous",
        framework: _FrameworkArg = None,
        framework_text: _FrameworkTextArg = None,
        argument: Annotated[
            str | None, Field(default=None, description="Optional argument to query for acceptance.")
        ] = None,
        args: _ArgsArg = None,
    ) -> AcceptanceResult:  # type: ignore[return-value]
        try:
            result = await service.check_acceptance(
                config, backend,
                framework=framework, framework_text=framework_text,
                semantics=semantics, mode=mode, argument=argument, args=args,
            )
            return _ok(result, _format_acceptance(result))  # type: ignore[return-value]
        except ServiceError as exc:
            return _error(exc)  # type: ignore[return-value]
        except Exception:
            logger.exception("check_acceptance failed")
            return _internal_error()  # type: ignore[return-value]

    return server


async def _run_stdio() -> None:
    config = load_config()
    backend = DungBackend(config)
    server = build_server(config, backend)
    try:
        await server.run_stdio_async()
    finally:
        await backend.aclose()


async def _run_http() -> None:
    from argumentation_mcp.http import register_health_routes, run_streamable_http

    config = load_config()
    backend = DungBackend(config)
    server = build_server(config, backend)
    register_health_routes(server, backend)
    try:
        await run_streamable_http(config, server)
    finally:
        await backend.aclose()


def _selected_transport() -> str:
    if len(sys.argv) > 1:
        return sys.argv[1].lower()
    return os.environ.get("ARGUMENTATION_MCP_TRANSPORT", "stdio").lower()


def main() -> None:
    # Logs go to stderr so stdout carries only MCP frames.
    logging.basicConfig(level=logging.INFO)
    import anyio

    transport = _selected_transport()
    if transport in ("http", "streamable-http"):
        anyio.run(_run_http)
    else:
        anyio.run(_run_stdio)


if __name__ == "__main__":
    main()
