"""Catalog of supported semantics and meta-reasoners.

The deployed ``/dung`` backend has no discovery endpoint, so this catalog mirrors
the abstract-argumentation module's front-end catalog. Keep the two in sync; the
authoritative list of keys the backend accepts is the abstract module's
``KNOWN_SEMANTIC_GROUPS`` / ``KNOWN_META_REASONERS``.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from argumentation_mcp.errors import ErrorCode, ServiceError


@dataclass(frozen=True)
class Semantics:
    key: str
    display_name: str
    group: str


@dataclass(frozen=True)
class ReasonerParam:
    key: str
    label: str
    description: str
    # A parameter is either a semantics pick (choices drawn from `compatible_semantics`)
    # or a fixed set of `options`. Exactly one is populated.
    compatible_semantics: tuple[str, ...] = ()
    options: tuple[str, ...] = ()
    default: str | None = None

    def allowed_values(self) -> tuple[str, ...]:
        return self.compatible_semantics or self.options

    def resolved_default(self) -> str:
        if self.default is not None:
            return self.default
        return self.allowed_values()[0]


@dataclass(frozen=True)
class MetaReasoner:
    key: str
    display_name: str
    parameters: tuple[ReasonerParam, ...] = field(default_factory=tuple)


SEMANTICS: tuple[Semantics, ...] = (
    Semantics("CF", "Conflict-Free", "classical"),
    Semantics("ADM", "Admissible", "classical"),
    Semantics("CO", "Complete", "classical"),
    Semantics("GR", "Grounded", "classical"),
    Semantics("PR", "Preferred", "classical"),
    Semantics("ST", "Stable", "classical"),
    Semantics("SAD", "Strongly Admissible", "admissibility-based"),
    Semantics("SST", "Semi-Stable", "admissibility-based"),
    Semantics("ID", "Ideal", "admissibility-based"),
    Semantics("EA", "Eager", "admissibility-based"),
    Semantics("IS", "Initial", "admissibility-based"),
    Semantics("UC", "Unchallenged", "admissibility-based"),
    Semantics("NA", "Naive", "non-admissible"),
    Semantics("STG", "Stage", "non-admissible"),
    Semantics("STG2", "Stage2", "non-admissible"),
    Semantics("CF2", "CF2", "non-admissible"),
    Semantics("SCF2", "SCF2", "non-admissible"),
    Semantics("UD", "Undisputed", "non-admissible"),
    Semantics("SUD", "Strongly Undisputed", "non-admissible"),
    Semantics("WAD", "Weakly Admissible", "weak"),
    Semantics("WCO", "Weakly Complete", "weak"),
    Semantics("WGR", "Weakly Grounded", "weak"),
    Semantics("WPR", "Weakly Preferred", "weak"),
)

_SELECTION_FUNCTIONS = ("ADM", "UC", "GR")
_TERMINATION_FUNCTIONS = ("ADM", "CO", "UC", "PR", "ST")
_SCC_DECOMPOSABLE = ("ADM", "CO", "GR", "PR", "ST")
_VACUOUS_BASE = ("CF", "ADM", "CO", "GR", "PR", "ST", "UD", "SUD")

META_REASONERS: tuple[MetaReasoner, ...] = (
    MetaReasoner(
        "QLD",
        "Qualified",
        (ReasonerParam("baseSemantics", "Base Semantics",
                       "SCC-decomposable base function for the qualified extensions.",
                       compatible_semantics=_SCC_DECOMPOSABLE),),
    ),
    MetaReasoner(
        "SQLD",
        "Semi-Qualified",
        (ReasonerParam("baseSemantics", "Base Semantics",
                       "SCC-decomposable base function for the semi-qualified extensions.",
                       compatible_semantics=_SCC_DECOMPOSABLE),),
    ),
    MetaReasoner(
        "VR",
        "Vacuous Reduct",
        (
            ReasonerParam("baseSemantics", "Base Semantics",
                          "Semantics whose extensions are filtered by the reduct condition.",
                          compatible_semantics=_VACUOUS_BASE),
            ReasonerParam("reductSemantics", "Reduct Semantics",
                          "Semantics that must not yield a non-empty extension on the reduct.",
                          compatible_semantics=_VACUOUS_BASE),
        ),
    ),
    MetaReasoner(
        "SER",
        "Serialisable",
        (
            ReasonerParam("selectionFunction", "Selection Function",
                          "Selects which initial sets may be added at each serialisation step.",
                          options=_SELECTION_FUNCTIONS, default="ADM"),
            ReasonerParam("terminationFunction", "Termination Function",
                          "Decides whether the current partial extension is accepted.",
                          options=_TERMINATION_FUNCTIONS, default="PR"),
        ),
    ),
)

_SEMANTICS_BY_KEY = {s.key: s for s in SEMANTICS}
_META_BY_KEY = {m.key: m for m in META_REASONERS}


def is_supported(key: str) -> bool:
    return key in _SEMANTICS_BY_KEY or key in _META_BY_KEY


def all_keys() -> list[str]:
    return [*_SEMANTICS_BY_KEY, *_META_BY_KEY]


def validate_and_default_args(semantics: str, args: dict[str, str]) -> dict[str, str]:
    """Validate ``args`` for ``semantics`` and fill in meta-reasoner defaults.

    Raises ``ServiceError`` (UNSUPPORTED_SEMANTICS / INVALID_REASONER_PARAMS).
    """
    if not is_supported(semantics):
        raise ServiceError(
            ErrorCode.UNSUPPORTED_SEMANTICS,
            f"Unsupported semantics {semantics!r}. Supported: {', '.join(all_keys())}.",
        )

    meta = _META_BY_KEY.get(semantics)
    if meta is None:
        # Plain semantics take no reasoner parameters.
        if args:
            raise ServiceError(
                ErrorCode.INVALID_REASONER_PARAMS,
                f"Semantics {semantics!r} takes no parameters, got {sorted(args)}.",
            )
        return {}

    known = {p.key: p for p in meta.parameters}
    unknown = sorted(set(args) - set(known))
    if unknown:
        raise ServiceError(
            ErrorCode.INVALID_REASONER_PARAMS,
            f"Unknown parameters for {semantics!r}: {unknown}. Expected: {sorted(known)}.",
        )

    resolved: dict[str, str] = {}
    for key, param in known.items():
        value = args.get(key, param.resolved_default())
        allowed = param.allowed_values()
        if value not in allowed:
            raise ServiceError(
                ErrorCode.INVALID_REASONER_PARAMS,
                f"Invalid value {value!r} for {key!r} of {semantics!r}. Allowed: {list(allowed)}.",
            )
        resolved[key] = value
    return resolved
