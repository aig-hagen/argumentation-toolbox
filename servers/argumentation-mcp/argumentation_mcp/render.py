"""Graphviz rendering of a framework to PNG.

DOT is built in-process (no shell) and piped to a fixed ``dot`` executable with a
fixed argument list; the PNG bytes are returned inline. Highlighted arguments are
filled without changing the framework itself. Layout is deterministic (nodes and
edges are emitted in framework order).
"""

from __future__ import annotations

import shutil
import subprocess

from argumentation_mcp.config import Config
from argumentation_mcp.contract import Framework
from argumentation_mcp.errors import ErrorCode, ServiceError

_HIGHLIGHT_FILL = "#b7e4c7"  # soft green


def _escape(name: str) -> str:
    return '"' + name.replace("\\", "\\\\").replace('"', '\\"') + '"'


def build_dot(framework: Framework, highlight: set[str]) -> str:
    lines = [
        "digraph AF {",
        "  rankdir=LR;",
        '  node [shape=circle, style=filled, fillcolor="#ffffff", fontname="sans-serif"];',
        '  edge [arrowhead=vee];',
    ]
    for name in framework.names:
        if name in highlight:
            lines.append(f"  {_escape(name)} [fillcolor=\"{_HIGHLIGHT_FILL}\"];")
        else:
            lines.append(f"  {_escape(name)};")
    for source, target in framework.attacks:
        lines.append(f"  {_escape(source)} -> {_escape(target)};")
    lines.append("}")
    return "\n".join(lines) + "\n"


def is_available(config: Config) -> bool:
    return shutil.which(config.graphviz_dot) is not None


def render_png(config: Config, framework: Framework, highlight: set[str]) -> bytes:
    if not is_available(config):
        raise ServiceError(ErrorCode.RENDER_FAILED, "Rendering is unavailable (Graphviz not found).")
    dot = build_dot(framework, highlight)
    try:
        result = subprocess.run(
            [config.graphviz_dot, "-Tpng"],
            input=dot.encode("utf-8"),
            capture_output=True,
            timeout=config.timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        raise ServiceError(ErrorCode.RENDER_FAILED, "Rendering timed out.") from exc
    except OSError as exc:
        raise ServiceError(ErrorCode.RENDER_FAILED, "Rendering failed to start.") from exc

    if result.returncode != 0 or not result.stdout:
        raise ServiceError(ErrorCode.RENDER_FAILED, "Rendering failed.")
    return result.stdout
