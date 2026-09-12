"""OAuth 2.1 resource-server authorization for the HTTP transport.

The MCP SDK, given a ``TokenVerifier`` and ``AuthSettings``, serves the
protected-resource metadata (RFC 9728), emits correct ``401`` challenges, and
enforces scopes/audience. This module supplies the verifier: a provider-agnostic
OIDC JWT validator (signature via the issuer's JWKS, plus issuer/audience/expiry)
and an optional static bearer token for development.

Nothing here logs token contents. Auth is configured entirely from the
environment (see ``config``) and only engages on the HTTP transport.
"""

from __future__ import annotations

import logging
import secrets

import anyio
import httpx
import jwt
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from pydantic import AnyHttpUrl

from argumentation_mcp.config import Config

logger = logging.getLogger(__name__)


def _scopes_from_claims(payload: dict) -> list[str]:
    scope = payload.get("scope")
    if isinstance(scope, str):
        return scope.split()
    for key in ("scp", "scopes"):
        value = payload.get(key)
        if isinstance(value, list):
            return [str(v) for v in value]
    return []


class StaticTokenVerifier(TokenVerifier):
    """Accepts a single configured bearer token. Development use only."""

    def __init__(self, token: str, resource: str, scopes: tuple[str, ...]):
        self._token = token
        self._resource = resource
        self._scopes = list(scopes)

    async def verify_token(self, token: str) -> AccessToken | None:
        if not self._token or not secrets.compare_digest(token, self._token):
            return None
        return AccessToken(
            token=token,
            client_id="dev",
            scopes=self._scopes,
            subject="dev",
            resource=self._resource,
            claims={"dev": True},
        )


class JwksTokenVerifier(TokenVerifier):
    """Validates OIDC access tokens against the issuer's JWKS."""

    def __init__(
        self,
        issuer: str,
        audience: str,
        resource: str,
        algorithms: tuple[str, ...],
        jwks_url: str = "",
    ):
        self._issuer = issuer
        self._audience = audience
        self._resource = resource
        self._algorithms = list(algorithms)
        self._explicit_jwks_url = jwks_url
        self._jwks_url: str | None = jwks_url or None
        self._client: jwt.PyJWKClient | None = None

    async def _resolve_jwks_url(self) -> str:
        if self._jwks_url is not None:
            return self._jwks_url
        # OIDC discovery, falling back to the OAuth authorization-server document.
        base = self._issuer.rstrip("/")
        candidates = (
            f"{base}/.well-known/openid-configuration",
            f"{base}/.well-known/oauth-authorization-server",
        )
        async with httpx.AsyncClient(timeout=10) as client:
            for url in candidates:
                try:
                    response = await client.get(url)
                    response.raise_for_status()
                    jwks_uri = response.json().get("jwks_uri")
                except (httpx.HTTPError, ValueError):
                    continue
                if isinstance(jwks_uri, str) and jwks_uri:
                    self._jwks_url = jwks_uri
                    return jwks_uri
        raise RuntimeError("could not discover the issuer's JWKS endpoint")

    def _decode(self, token: str, jwks_url: str) -> AccessToken:
        if self._client is None or self._client.uri != jwks_url:
            self._client = jwt.PyJWKClient(jwks_url, cache_keys=True)
        signing_key = self._client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=self._algorithms,
            audience=self._audience,
            issuer=self._issuer,
            options={"require": ["exp"]},
        )
        client_id = payload.get("azp") or payload.get("client_id") or payload.get("sub") or "unknown"
        return AccessToken(
            token=token,
            client_id=str(client_id),
            scopes=_scopes_from_claims(payload),
            expires_at=payload.get("exp"),
            subject=payload.get("sub"),
            resource=self._resource,
            claims=payload,
        )

    async def verify_token(self, token: str) -> AccessToken | None:
        try:
            jwks_url = await self._resolve_jwks_url()
            return await anyio.to_thread.run_sync(self._decode, token, jwks_url)
        except Exception as exc:  # noqa: BLE001 - any failure means "not verified"
            logger.info("Rejected bearer token: %s", type(exc).__name__)
            return None


class CompositeTokenVerifier(TokenVerifier):
    """Tries each verifier in order; the first to accept wins."""

    def __init__(self, verifiers: list[TokenVerifier]):
        self._verifiers = verifiers

    async def verify_token(self, token: str) -> AccessToken | None:
        for verifier in self._verifiers:
            access = await verifier.verify_token(token)
            if access is not None:
                return access
        return None


def build_auth(config: Config) -> tuple[TokenVerifier | None, AuthSettings | None]:
    """Build the token verifier and auth settings, or ``(None, None)`` if disabled."""
    if not config.auth_enabled():
        return None, None

    resource = config.resource_server_url
    verifiers: list[TokenVerifier] = []
    if config.dev_token:
        verifiers.append(StaticTokenVerifier(config.dev_token, resource, config.required_scopes))
    if config.oauth_issuer:
        verifiers.append(
            JwksTokenVerifier(
                issuer=config.oauth_issuer,
                audience=config.audience(),
                resource=resource,
                algorithms=config.oauth_algorithms,
                jwks_url=config.oauth_jwks_url,
            )
        )

    verifier = verifiers[0] if len(verifiers) == 1 else CompositeTokenVerifier(verifiers)
    settings = AuthSettings(
        issuer_url=AnyHttpUrl(config.oauth_issuer or resource),
        resource_server_url=AnyHttpUrl(resource),
        required_scopes=list(config.required_scopes) or None,
        validate_token_resource=True,
    )
    return verifier, settings
