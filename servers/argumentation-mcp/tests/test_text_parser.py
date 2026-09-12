from __future__ import annotations

import pytest

from argumentation_mcp.errors import ErrorCode, ServiceError
from argumentation_mcp.text_parser import parse_framework_text


def test_declares_and_attacks_arrow_and_space():
    fw = parse_framework_text("a\nb\nc\na -> b\nb c\n")
    assert fw.names == ("a", "b", "c")
    assert fw.attacks == (("a", "b"), ("b", "c"))


def test_comments_and_blank_lines_ignored():
    fw = parse_framework_text("# heading\n\na  # the first arg\nb\na -> b # attack\n")
    assert fw.names == ("a", "b")
    assert fw.attacks == (("a", "b"),)


def test_unicode_names():
    fw = parse_framework_text("α\nβ\nα -> β\n")
    assert fw.names == ("α", "β")
    assert fw.attacks == (("α", "β"),)


def test_self_attack_and_cycle():
    fw = parse_framework_text("a\nb\na -> a\na -> b\nb -> a\n")
    assert ("a", "a") in fw.attacks
    assert ("a", "b") in fw.attacks and ("b", "a") in fw.attacks


def test_duplicate_argument_rejected():
    with pytest.raises(ServiceError) as exc:
        parse_framework_text("a\na\n")
    assert exc.value.code is ErrorCode.INVALID_FRAMEWORK


def test_undeclared_endpoint_rejected():
    with pytest.raises(ServiceError) as exc:
        parse_framework_text("a\na -> b\n")
    assert exc.value.code is ErrorCode.INVALID_FRAMEWORK


def test_multiple_arrows_rejected():
    with pytest.raises(ServiceError):
        parse_framework_text("a\nb\nc\na -> b -> c\n")


def test_too_many_tokens_rejected():
    with pytest.raises(ServiceError):
        parse_framework_text("a b c\n")


def test_empty_text_rejected():
    with pytest.raises(ServiceError) as exc:
        parse_framework_text("\n  \n# only comments\n")
    assert exc.value.code is ErrorCode.INVALID_FRAMEWORK
