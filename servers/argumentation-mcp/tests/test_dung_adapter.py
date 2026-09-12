from __future__ import annotations

import httpx
import pytest

from argumentation_mcp.contract import validate_framework
from argumentation_mcp.dung import DungBackend, parse_list_of_sets, parse_set
from argumentation_mcp.errors import ErrorCode, ServiceError
from tests.conftest import answer, make_backend


# --- answer string parsing ---------------------------------------------------


def test_parse_set():
    assert parse_set("{1,3}") == [1, 3]
    assert parse_set("{}") == []
    assert parse_set(" { 2 } ") == [2]


def test_parse_list_of_sets():
    assert parse_list_of_sets("[{2},{1,3}]") == [[2], [1, 3]]
    assert parse_list_of_sets("[]") == []
    assert parse_list_of_sets("[{}]") == [[]]


def test_parse_rejects_garbage():
    with pytest.raises(ServiceError) as exc:
        parse_list_of_sets("not-a-list")
    assert exc.value.code is ErrorCode.MALFORMED_BACKEND_RESPONSE
    with pytest.raises(ServiceError):
        parse_set("[1,2]")


# --- backend adapter ---------------------------------------------------------


async def test_enumerate_builds_payload_and_maps_names():
    captured = {}

    def handler(body):
        captured.update(body)
        return answer("[{1},{2,3}]")

    fw = validate_framework(["a", "b", "c"], [("a", "b"), ("b", "c")])
    backend = make_backend(config_for(), handler)
    elapsed, extensions = await backend.enumerate_extensions(fw, "PR", {})

    assert captured["cmd"] == "get_models"
    assert captured["nr_of_arguments"] == 3
    assert captured["attacks"] == [[1, 2], [2, 3]]
    assert captured["semantics"] == "PR"
    assert captured["unit_timeout"] == "ms"
    assert "email" in captured
    assert elapsed == 12.0
    assert extensions == [["a"], ["b", "c"]]


async def test_acceptance_credulous_and_skeptical():
    def handler(body):
        assert body["cmd"] in ("get_credulous", "get_skeptical")
        return answer("{1,3}")

    fw = validate_framework(["a", "b", "c"], [])
    backend = make_backend(config_for(), handler)
    _, cred = await backend.acceptance("credulous", fw, "ST", {})
    _, skep = await backend.acceptance("skeptical", fw, "ST", {})
    assert cred == ["a", "c"]
    assert skep == ["a", "c"]


async def test_timeout_status_maps_to_backend_timeout():
    backend = make_backend(config_for(), lambda body: answer("", status="TIMEOUT"))
    fw = validate_framework(["a"], [])
    with pytest.raises(ServiceError) as exc:
        await backend.enumerate_extensions(fw, "PR", {})
    assert exc.value.code is ErrorCode.BACKEND_TIMEOUT
    assert exc.value.retryable is True


async def test_out_of_range_index_is_malformed():
    backend = make_backend(config_for(), lambda body: answer("[{9}]"))
    fw = validate_framework(["a"], [])
    with pytest.raises(ServiceError) as exc:
        await backend.enumerate_extensions(fw, "PR", {})
    assert exc.value.code is ErrorCode.MALFORMED_BACKEND_RESPONSE


async def test_http_503_is_unavailable():
    backend = make_backend(config_for(), lambda body: httpx.Response(503))
    fw = validate_framework(["a"], [])
    with pytest.raises(ServiceError) as exc:
        await backend.enumerate_extensions(fw, "PR", {})
    assert exc.value.code is ErrorCode.BACKEND_UNAVAILABLE


async def test_null_answer_is_malformed():
    backend = make_backend(config_for(), lambda body: httpx.Response(200, json={"time": 1, "answer": None}))
    fw = validate_framework(["a"], [])
    with pytest.raises(ServiceError) as exc:
        await backend.enumerate_extensions(fw, "PR", {})
    assert exc.value.code is ErrorCode.MALFORMED_BACKEND_RESPONSE


def config_for():
    from argumentation_mcp.config import Config

    return Config(dung_url="http://backend.test/dung", timeout_seconds=5, max_request_bytes=4096)
