from __future__ import annotations

import pytest

from argumentation_mcp.contract import validate_framework
from argumentation_mcp.errors import ErrorCode, ServiceError


def test_indexed_attacks_are_one_based():
    fw = validate_framework(["a", "b", "c"], [("a", "b"), ("b", "c")])
    assert fw.nr_of_arguments == 3
    assert fw.indexed_attacks() == [[1, 2], [2, 3]]


def test_name_for_index_roundtrip():
    fw = validate_framework(["x", "y"], [])
    assert fw.name_for_index(1) == "x"
    assert fw.name_for_index(2) == "y"


def test_name_for_index_out_of_range():
    fw = validate_framework(["x"], [])
    with pytest.raises(ServiceError) as exc:
        fw.name_for_index(2)
    assert exc.value.code is ErrorCode.MALFORMED_BACKEND_RESPONSE


def test_empty_framework_rejected():
    with pytest.raises(ServiceError):
        validate_framework([], [])


def test_duplicate_name_rejected():
    with pytest.raises(ServiceError):
        validate_framework(["a", "a"], [])


def test_unknown_endpoint_rejected():
    with pytest.raises(ServiceError):
        validate_framework(["a"], [("a", "b")])


def test_duplicate_attack_rejected():
    with pytest.raises(ServiceError):
        validate_framework(["a", "b"], [("a", "b"), ("a", "b")])
