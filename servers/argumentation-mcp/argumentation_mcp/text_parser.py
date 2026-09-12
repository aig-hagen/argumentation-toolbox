"""Parser for the terse, chat-friendly framework text form.

Grammar (one item per line):

    # a full-line or trailing comment
    a               declares an argument
    a b             an attack a -> b (whitespace-separated)
    a -> b          an attack a -> b (arrow form)

Rules: blank lines and comments (``#`` to end of line) are ignored; argument
names may not contain whitespace, ``#`` or the ``->`` arrow; every attack
endpoint must also appear as a declared argument; duplicate declarations and
duplicate attacks are rejected. Argument order has no meaning.
"""

from __future__ import annotations

from argumentation_mcp.contract import Framework, validate_framework
from argumentation_mcp.errors import ErrorCode, ServiceError

_ARROW = "->"


def _strip_comment(line: str) -> str:
    hash_index = line.find("#")
    return line if hash_index == -1 else line[:hash_index]


def _fail(line_no: int, detail: str) -> ServiceError:
    return ServiceError(ErrorCode.INVALID_FRAMEWORK, f"Line {line_no}: {detail}")


def parse_framework_text(text: str) -> Framework:
    """Parse the terse text form into a validated ``Framework``."""
    declared: list[str] = []
    declared_set: set[str] = set()
    attacks: list[tuple[str, str]] = []

    for line_no, raw in enumerate(text.splitlines(), start=1):
        line = _strip_comment(raw).strip()
        if line == "":
            continue

        if _ARROW in line:
            source, sep, target = line.partition(_ARROW)
            if _ARROW in target:
                raise _fail(line_no, "an attack line may contain only one '->' arrow.")
            source, target = source.strip(), target.strip()
            if source == "" or target == "":
                raise _fail(line_no, "an attack needs a source and a target around '->'.")
            _reject_bad_name(line_no, source)
            _reject_bad_name(line_no, target)
            attacks.append((source, target))
            continue

        tokens = line.split()
        if len(tokens) == 1:
            name = tokens[0]
            _reject_bad_name(line_no, name)
            if name in declared_set:
                raise _fail(line_no, f"duplicate argument {name!r}.")
            declared_set.add(name)
            declared.append(name)
        elif len(tokens) == 2:
            attacks.append((tokens[0], tokens[1]))
        else:
            raise _fail(line_no, "expected an argument name, 'a b', or 'a -> b'.")

    # Auto-declare nothing: every endpoint must have been declared explicitly.
    for source, target in attacks:
        for endpoint in (source, target):
            if endpoint not in declared_set:
                raise ServiceError(
                    ErrorCode.INVALID_FRAMEWORK,
                    f"Attack references undeclared argument {endpoint!r}.",
                )

    return validate_framework(declared, attacks)


def _reject_bad_name(line_no: int, name: str) -> None:
    if name == "":
        raise _fail(line_no, "argument name must be non-empty.")
    if "#" in name or _ARROW in name or any(c.isspace() for c in name):
        raise _fail(line_no, f"invalid argument name {name!r}.")
