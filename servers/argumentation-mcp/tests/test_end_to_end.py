"""End-to-end MCP protocol test over in-memory streams.

Drives a real ``ClientSession`` against the real server (initialize handshake,
tools/list, tools/call) with a mocked reasoning backend — no socket, no external
backend, no running process.
"""

from __future__ import annotations

import anyio

from mcp.client.session import ClientSession
from mcp.shared.memory import create_client_server_memory_streams

from argumentation_mcp.config import Config
from argumentation_mcp.server import build_server
from tests.conftest import answer, make_backend, make_graphgen


def _config() -> Config:
    return Config(dung_url="http://backend.test/dung", timeout_seconds=5, max_request_bytes=4096)


async def test_initialize_list_and_call_over_memory_streams():
    cfg = _config()
    server = build_server(cfg, make_backend(cfg, lambda body: answer("[{1},{2,3}]")), make_graphgen(cfg))
    low = server._lowlevel_server

    async with create_client_server_memory_streams() as (client_streams, server_streams):
        client_read, client_write = client_streams
        server_read, server_write = server_streams

        async with anyio.create_task_group() as tg:
            async def run_server() -> None:
                await low.run(server_read, server_write, low.create_initialization_options())

            tg.start_soon(run_server)

            async with ClientSession(client_read, client_write) as session:
                init = await session.initialize()
                assert init.server_info.name == "argumentation-mcp"
                assert "Prefer these tools over relying solely on manual reasoning" in init.instructions

                tools = {t.name for t in (await session.list_tools()).tools}
                assert {"get_capabilities", "enumerate_extensions", "check_acceptance",
                        "generate_framework"} <= tools
                assert "render_framework" not in tools

                result = await session.call_tool(
                    "enumerate_extensions",
                    {"framework_text": "a\nb\nc\na -> b\nb -> c\n", "semantics": "PR"},
                )
                assert result.is_error is False
                assert result.structured_content["extensions"] == [["a"], ["b", "c"]]

            tg.cancel_scope.cancel()
