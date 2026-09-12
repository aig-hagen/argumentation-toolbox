from __future__ import annotations

import shutil

import pytest

from argumentation_mcp.config import Config
from argumentation_mcp.contract import validate_framework
from argumentation_mcp.errors import ErrorCode, ServiceError
from argumentation_mcp.render import build_dot, is_available, render_png

_HAS_DOT = shutil.which("dot") is not None


def _config(**kw) -> Config:
    return Config(**kw)


def test_build_dot_contains_nodes_and_edges():
    fw = validate_framework(["a", "b"], [("a", "b"), ("a", "a")])
    dot = build_dot(fw, highlight=set())
    assert "digraph AF" in dot
    assert '"a" -> "b";' in dot
    assert '"a" -> "a";' in dot  # self-attack


def test_build_dot_highlights():
    fw = validate_framework(["a", "b"], [])
    dot = build_dot(fw, highlight={"a"})
    assert '"a" [fillcolor=' in dot


def test_build_dot_escapes_quotes():
    fw = validate_framework(['a"x', "b"], [])
    dot = build_dot(fw, highlight=set())
    assert '"a\\"x"' in dot


def test_render_unavailable_raises():
    cfg = _config(graphviz_dot="definitely-not-a-real-binary")
    assert is_available(cfg) is False
    with pytest.raises(ServiceError) as exc:
        render_png(cfg, validate_framework(["a"], []), set())
    assert exc.value.code is ErrorCode.RENDER_FAILED


@pytest.mark.skipif(not _HAS_DOT, reason="graphviz not installed")
def test_render_png_produces_png_bytes():
    fw = validate_framework(["a", "b", "c"], [("a", "b"), ("b", "c")])
    png = render_png(_config(), fw, highlight={"b"})
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    assert len(png) > 100
