"""Manual smoke test: talk to the server over stdio and print real results.

Runs a full MCP client session (initialize, list tools, call a tool) against the
server as a subprocess, pointed at the public /dung by default. No Node, no
Inspector — just the SDK already in this package's venv.

    python smoke.py

Override the backend with ARGUMENTATION_MCP_DUNG_URL if you want a local one.
"""

from __future__ import annotations

import os

import anyio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

_DUNG_URL = os.environ.get(
    "ARGUMENTATION_MCP_DUNG_URL", "https://agonproject.aig.fernuni-hagen.de/dung"
)

_PARAMS = StdioServerParameters(
    command="python",
    args=["-m", "argumentation_mcp"],
    env={"ARGUMENTATION_MCP_DUNG_URL": _DUNG_URL, **os.environ},
)

_FRAMEWORK = "a\nb\nc\na -> b\nb -> c"


async def main() -> None:
    async with stdio_client(_PARAMS) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print("tools:", [t.name for t in (await session.list_tools()).tools])

            result = await session.call_tool(
                "enumerate_extensions",
                {"framework_text": _FRAMEWORK, "semantics": "PR"},
            )
            print("is_error:", result.is_error)
            print("structured:", result.structured_content)
            print("text:", result.content[0].text)


if __name__ == "__main__":
    anyio.run(main)
