from __future__ import annotations

import json

from argumentation_mcp.server import build_server
from tests.conftest import answer, make_backend


def _config():
    from argumentation_mcp.config import Config

    return Config(dung_url="http://backend.test/dung", timeout_seconds=5, max_request_bytes=4096)


async def test_tools_are_advertised_with_output_schema():
    server = build_server(_config(), make_backend(_config(), lambda body: answer("[]")))
    tools = {t.name: t for t in await server.list_tools()}
    assert set(tools) == {"get_capabilities", "enumerate_extensions", "check_acceptance"}
    for tool in tools.values():
        assert tool.output_schema is not None
        assert tool.annotations is not None and tool.annotations.read_only_hint is True


async def test_enumerate_call_returns_structured_and_text():
    cfg = _config()
    server = build_server(cfg, make_backend(cfg, lambda body: answer("[{1},{2,3}]")))
    result = await server.call_tool(
        "enumerate_extensions",
        {"framework_text": "a\nb\nc\na -> b\nb -> c\n", "semantics": "PR"},
    )
    assert result.is_error is False
    assert result.structured_content["extensions"] == [["a"], ["b", "c"]]
    assert "extension" in result.content[0].text


async def test_error_call_returns_structured_error_payload():
    cfg = _config()
    server = build_server(cfg, make_backend(cfg, lambda body: answer("[]")))
    # Both framework and framework_text omitted -> INVALID_REQUEST.
    result = await server.call_tool("enumerate_extensions", {"semantics": "PR"})
    assert result.is_error is True
    payload = json.loads(result.content[0].text)
    assert payload["code"] == "INVALID_REQUEST"
    assert payload["retryable"] is False
