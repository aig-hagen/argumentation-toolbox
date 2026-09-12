from __future__ import annotations

import pytest

from argumentation_mcp import service
from argumentation_mcp.config import Config
from argumentation_mcp.contract import AttackInput, FrameworkInput
from argumentation_mcp.errors import ErrorCode, ServiceError
from tests.conftest import answer, make_backend, make_graphgen


def _config() -> Config:
    return Config(dung_url="http://backend.test/dung", timeout_seconds=5, max_request_bytes=200)


def _framework() -> FrameworkInput:
    return FrameworkInput(
        arguments=["a", "b", "c"],
        attacks=[AttackInput(source="a", target="b"), AttackInput(source="b", target="c")],
    )


def test_resolve_requires_exactly_one():
    cfg = _config()
    with pytest.raises(ServiceError) as exc:
        service.resolve_framework(cfg, None, None)
    assert exc.value.code is ErrorCode.INVALID_REQUEST
    with pytest.raises(ServiceError):
        service.resolve_framework(cfg, _framework(), "a\n")


def test_resolve_text_path():
    fw = service.resolve_framework(_config(), None, "a\nb\na -> b\n")
    assert fw.names == ("a", "b")


def test_resolve_enforces_size_limit():
    cfg = Config(max_request_bytes=5)
    with pytest.raises(ServiceError) as exc:
        service.resolve_framework(cfg, None, "a\nb\nc\na -> b\n")
    assert exc.value.code is ErrorCode.REQUEST_TOO_LARGE


async def test_enumerate_extensions_end_to_end():
    backend = make_backend(_config(), lambda body: answer("[{1},{1,3}]"))
    result = await service.enumerate_extensions(
        _config(), backend, framework=_framework(), framework_text=None, semantics="PR", args=None
    )
    assert result.semantics == "PR"
    assert result.extensions == [["a"], ["a", "c"]]
    assert result.solver_time_ms == 12
    assert result.schema_version == "1"


async def test_check_acceptance_with_query():
    backend = make_backend(_config(), lambda body: answer("{1,3}"))
    result = await service.check_acceptance(
        _config(), backend, framework=_framework(), framework_text=None,
        semantics="ST", mode="credulous", argument="c", args=None,
    )
    assert result.accepted_arguments == ["a", "c"]
    assert result.query is not None
    assert result.query.argument == "c" and result.query.accepted is True


async def test_check_acceptance_query_not_in_framework():
    backend = make_backend(_config(), lambda body: answer("{1}"))
    with pytest.raises(ServiceError) as exc:
        await service.check_acceptance(
            _config(), backend, framework=_framework(), framework_text=None,
            semantics="ST", mode="credulous", argument="z", args=None,
        )
    assert exc.value.code is ErrorCode.INVALID_FRAMEWORK


async def test_invalid_mode():
    backend = make_backend(_config(), lambda body: answer("{1}"))
    with pytest.raises(ServiceError) as exc:
        await service.check_acceptance(
            _config(), backend, framework=_framework(), framework_text=None,
            semantics="ST", mode="sideways", argument=None, args=None,
        )
    assert exc.value.code is ErrorCode.INVALID_REQUEST


async def test_get_capabilities_reports_backend_up():
    backend = make_backend(_config(), lambda body: answer("[{1}]"))
    algos = [{"id": "erdos-renyi", "description": "ER", "params": [{"name": "n"}], "available": True}]

    def gg(request):
        import httpx

        return httpx.Response(200, json=algos)

    caps = await service.get_capabilities(_config(), backend, make_graphgen(_config(), gg))
    assert caps.backends.reasoning is True
    assert caps.backends.generation is True
    assert any(s.key == "PR" for s in caps.semantics)
    assert caps.generation_algorithms[0].id == "erdos-renyi"
    assert caps.limits.timeout_seconds == 5
    assert "render_framework" in caps.operations
