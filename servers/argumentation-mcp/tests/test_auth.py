from __future__ import annotations

import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from argumentation_mcp import auth as auth_mod
from argumentation_mcp.auth import (
    CompositeTokenVerifier,
    JwksTokenVerifier,
    StaticTokenVerifier,
    build_auth,
)
from argumentation_mcp.config import Config

_ISSUER = "https://issuer.test"
_AUDIENCE = "https://agon.test/mcp"
_RESOURCE = "https://agon.test/mcp"


@pytest.fixture(scope="module")
def rsa_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(autouse=True)
def fake_jwk_client(monkeypatch, rsa_key):
    public_key = rsa_key.public_key()

    class FakeJWKClient:
        def __init__(self, uri, *args, **kwargs):
            self.uri = uri

        def get_signing_key_from_jwt(self, _token):
            return SimpleNamespace(key=public_key)

    monkeypatch.setattr(auth_mod.jwt, "PyJWKClient", FakeJWKClient)


def _token(rsa_key, **overrides) -> str:
    claims = {
        "iss": _ISSUER,
        "aud": _AUDIENCE,
        "sub": "user-1",
        "azp": "client-9",
        "scope": "argumentation:reason profile",
        "exp": int(time.time()) + 300,
    }
    claims.update(overrides)
    return jwt.encode(claims, rsa_key, algorithm="RS256")


def _verifier(jwks_url="https://issuer.test/jwks") -> JwksTokenVerifier:
    return JwksTokenVerifier(
        issuer=_ISSUER, audience=_AUDIENCE, resource=_RESOURCE,
        algorithms=("RS256",), jwks_url=jwks_url,
    )


# --- static token ------------------------------------------------------------


async def test_static_token_accepts_and_rejects():
    verifier = StaticTokenVerifier("s3cret", _RESOURCE, ())
    accepted = await verifier.verify_token("s3cret")
    assert accepted is not None and accepted.subject == "dev"
    assert accepted.resource == _RESOURCE
    assert await verifier.verify_token("wrong") is None


# --- JWKS JWT ----------------------------------------------------------------


async def test_jwt_valid(rsa_key):
    access = await _verifier().verify_token(_token(rsa_key))
    assert access is not None
    assert access.subject == "user-1"
    assert access.client_id == "client-9"
    assert access.scopes == ["argumentation:reason", "profile"]
    assert access.resource == _RESOURCE


async def test_jwt_wrong_audience(rsa_key):
    assert await _verifier().verify_token(_token(rsa_key, aud="https://elsewhere")) is None


async def test_jwt_wrong_issuer(rsa_key):
    assert await _verifier().verify_token(_token(rsa_key, iss="https://evil")) is None


async def test_jwt_expired(rsa_key):
    assert await _verifier().verify_token(_token(rsa_key, exp=int(time.time()) - 10)) is None


# --- composite + wiring ------------------------------------------------------


async def test_composite_prefers_first_match(rsa_key):
    verifier = CompositeTokenVerifier([StaticTokenVerifier("dev", _RESOURCE, ()), _verifier()])
    assert (await verifier.verify_token("dev")).client_id == "dev"
    assert (await verifier.verify_token(_token(rsa_key))).client_id == "client-9"


def test_build_auth_disabled_without_resource_url():
    verifier, settings = build_auth(Config())
    assert verifier is None and settings is None


def test_build_auth_enabled_with_issuer():
    cfg = Config(resource_server_url=_RESOURCE, oauth_issuer=_ISSUER)
    verifier, settings = build_auth(cfg)
    assert verifier is not None
    assert settings is not None
    assert str(settings.issuer_url).rstrip("/") == _ISSUER
    assert str(settings.resource_server_url).rstrip("/") == _RESOURCE


def test_build_auth_dev_only_uses_resource_as_issuer():
    cfg = Config(resource_server_url=_RESOURCE, dev_token="t")
    verifier, settings = build_auth(cfg)
    assert verifier is not None
    assert str(settings.issuer_url).rstrip("/") == _RESOURCE
