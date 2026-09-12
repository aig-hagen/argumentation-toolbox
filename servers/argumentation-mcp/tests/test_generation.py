from __future__ import annotations

import httpx
import pytest

from argumentation_mcp.config import Config
from argumentation_mcp.errors import ErrorCode, ServiceError
from tests.conftest import make_graphgen

_ALGOS = [{"id": "erdos-renyi", "description": "ER", "params": [], "available": True}]


def _config() -> Config:
    return Config(graph_gen_url="http://graphgen.test", timeout_seconds=5)


def test_list_algorithms():
    async def go():
        backend = make_graphgen(_config(), lambda req: httpx.Response(200, json=_ALGOS))
        return await backend.list_algorithms()

    import anyio

    algos = anyio.run(go)
    assert algos[0]["id"] == "erdos-renyi"


async def test_generate_maps_to_named_framework():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        import json

        if request.url.path == "/generate":
            captured.update(json.loads(request.content))
            return httpx.Response(200, json={"nr_of_arguments": 3, "attacks": [[1, 2], [2, 3]]})
        return httpx.Response(200, json=_ALGOS)

    backend = make_graphgen(_config(), handler)
    framework = await backend.generate("erdos-renyi", {"n": 3, "p": 0.5}, seed=7)

    assert captured["framework_type"] == "abstract"
    assert captured["params"]["seed"] == 7
    assert framework.names == ("a1", "a2", "a3")
    assert framework.attacks == (("a1", "a2"), ("a2", "a3"))


async def test_generate_400_is_generation_failed():
    backend = make_graphgen(
        _config(),
        lambda req: httpx.Response(400, json={"detail": "Unknown algorithm: 'nope'"}),
    )
    with pytest.raises(ServiceError) as exc:
        await backend.generate("nope", {}, seed=None)
    assert exc.value.code is ErrorCode.GENERATION_FAILED


async def test_generate_503_is_unavailable():
    backend = make_graphgen(_config(), lambda req: httpx.Response(503))
    with pytest.raises(ServiceError) as exc:
        await backend.generate("erdos-renyi", {}, seed=None)
    assert exc.value.code is ErrorCode.BACKEND_UNAVAILABLE


async def test_generate_malformed_shape():
    backend = make_graphgen(_config(), lambda req: httpx.Response(200, json={"foo": "bar"}))
    with pytest.raises(ServiceError) as exc:
        await backend.generate("erdos-renyi", {}, seed=None)
    assert exc.value.code is ErrorCode.GENERATION_FAILED
