from __future__ import annotations

import pytest

from argumentation_mcp.errors import ErrorCode, ServiceError
from argumentation_mcp.semantics import validate_and_default_args


def test_plain_semantics_no_args():
    assert validate_and_default_args("PR", {}) == {}


def test_unsupported_semantics():
    with pytest.raises(ServiceError) as exc:
        validate_and_default_args("NOPE", {})
    assert exc.value.code is ErrorCode.UNSUPPORTED_SEMANTICS


def test_plain_semantics_reject_args():
    with pytest.raises(ServiceError) as exc:
        validate_and_default_args("PR", {"baseSemantics": "CO"})
    assert exc.value.code is ErrorCode.INVALID_REASONER_PARAMS


def test_meta_fills_defaults():
    resolved = validate_and_default_args("SER", {})
    assert resolved == {"selectionFunction": "ADM", "terminationFunction": "PR"}


def test_meta_accepts_valid_value():
    resolved = validate_and_default_args("QLD", {"baseSemantics": "ST"})
    assert resolved == {"baseSemantics": "ST"}


def test_meta_rejects_invalid_value():
    with pytest.raises(ServiceError) as exc:
        validate_and_default_args("QLD", {"baseSemantics": "CF"})
    assert exc.value.code is ErrorCode.INVALID_REASONER_PARAMS


def test_meta_rejects_unknown_param():
    with pytest.raises(ServiceError) as exc:
        validate_and_default_args("QLD", {"wat": "ST"})
    assert exc.value.code is ErrorCode.INVALID_REASONER_PARAMS
