"""The canonical framework contract shared by every tool.

An argument's name is its identifier: names are unique, non-empty strings, and
outputs echo the original names. Argument order carries no meaning but fixes the
deterministic name-to-index mapping used by the backend.
"""

from __future__ import annotations

from dataclasses import dataclass

from pydantic import BaseModel, Field

from argumentation_mcp.errors import ErrorCode, ServiceError


class AttackInput(BaseModel):
    source: str = Field(description="Name of the attacking argument.")
    target: str = Field(description="Name of the attacked argument.")


class FrameworkInput(BaseModel):
    """Structured framework as accepted over the MCP boundary."""

    arguments: list[str] = Field(description="Unique, non-empty argument names.")
    attacks: list[AttackInput] = Field(
        default_factory=list,
        description="Directed attacks; every endpoint must be a declared argument.",
    )


@dataclass(frozen=True)
class Framework:
    """A validated framework with a stable name/index mapping.

    Indices are 1-based to match the backend contract; ``names[i - 1]`` maps an
    index back to its name.
    """

    names: tuple[str, ...]
    attacks: tuple[tuple[str, str], ...]

    @property
    def nr_of_arguments(self) -> int:
        return len(self.names)

    def indexed_attacks(self) -> list[list[int]]:
        index = {name: i + 1 for i, name in enumerate(self.names)}
        return [[index[s], index[t]] for s, t in self.attacks]

    def name_for_index(self, index: int) -> str:
        if not 1 <= index <= len(self.names):
            raise ServiceError(
                ErrorCode.MALFORMED_BACKEND_RESPONSE,
                f"Backend referenced argument index {index}, out of range 1..{len(self.names)}.",
            )
        return self.names[index - 1]


def validate_framework(arguments: list[str], attacks: list[tuple[str, str]]) -> Framework:
    """Validate raw arguments/attacks into a ``Framework``.

    Raises ``ServiceError(INVALID_FRAMEWORK)`` on any contract violation.
    """
    if not arguments:
        raise ServiceError(ErrorCode.INVALID_FRAMEWORK, "A framework needs at least one argument.")

    seen: set[str] = set()
    for name in arguments:
        if not isinstance(name, str) or name == "":
            raise ServiceError(ErrorCode.INVALID_FRAMEWORK, "Argument names must be non-empty strings.")
        if name in seen:
            raise ServiceError(ErrorCode.INVALID_FRAMEWORK, f"Duplicate argument name {name!r}.")
        seen.add(name)

    normalized_attacks: list[tuple[str, str]] = []
    attack_seen: set[tuple[str, str]] = set()
    for source, target in attacks:
        if source not in seen:
            raise ServiceError(ErrorCode.INVALID_FRAMEWORK, f"Attack source {source!r} is not a declared argument.")
        if target not in seen:
            raise ServiceError(ErrorCode.INVALID_FRAMEWORK, f"Attack target {target!r} is not a declared argument.")
        pair = (source, target)
        if pair in attack_seen:
            raise ServiceError(ErrorCode.INVALID_FRAMEWORK, f"Duplicate attack {source!r} -> {target!r}.")
        attack_seen.add(pair)
        normalized_attacks.append(pair)

    return Framework(names=tuple(arguments), attacks=tuple(normalized_attacks))


def framework_from_input(model: FrameworkInput) -> Framework:
    return validate_framework(
        list(model.arguments),
        [(a.source, a.target) for a in model.attacks],
    )
