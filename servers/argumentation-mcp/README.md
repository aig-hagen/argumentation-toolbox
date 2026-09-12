# Argumentation MCP Server

An [MCP](https://modelcontextprotocol.io/) server that exposes AgonProject's
abstract argumentation reasoning as typed, agent-friendly tools. Reasoning is
delegated to the existing TweetyProject [`/dung`](../../deployment/Caddyfile)
web service — this server is a stateless, transport-independent adapter around it.

For the full design, contracts, and delivery phases, see
[`docs/mcp-argumentation-service.md`](../../docs/mcp-argumentation-service.md).

## Tools

| Tool | Purpose |
|---|---|
| `get_capabilities` | Supported semantics, meta-reasoner parameters, operations, generation algorithms, backend availability, and configured limits. |
| `enumerate_extensions` | Every extension under a chosen semantics. |
| `check_acceptance` | Credulous or skeptical acceptance, optionally for a queried argument. |
| `render_framework` | Render a framework to PNG (via Graphviz), optionally highlighting arguments. |
| `generate_framework` | Generate an abstract framework (via graph-gen) in the canonical format. |

All tools are read-only. Reasoning/generation tools return validated
`structuredContent` (see each tool's `outputSchema`) plus a compact text fallback;
`render_framework` additionally returns an `image` content block. Failures are
`isError` results carrying a stable `{ code, message, retryable }` payload.

Rendering needs the `dot` executable (Graphviz); generation needs the graph-gen
service. Both are reported through `get_capabilities` and degrade to a clear
error rather than failing server startup.

## Framework input

Each framework-consuming tool accepts **exactly one** of:

- `framework` — structured: `{ "arguments": ["a","b"], "attacks": [{"source":"a","target":"b"}] }`
- `framework_text` — terse text, one item per line:

  ```text
  a
  b
  c
  a -> b   # or: a b
  b -> c
  ```

Argument names are the identifiers; they are unique, non-empty, and echoed back
in results. See the module docstrings in
[`argumentation_mcp/contract.py`](argumentation_mcp/contract.py) and
[`argumentation_mcp/text_parser.py`](argumentation_mcp/text_parser.py) for the
exact rules.

## Configuration

Environment variables (all optional; defaults suit a local backend):

| Variable | Default | Meaning |
|---|---|---|
| `ARGUMENTATION_MCP_DUNG_URL` | `http://localhost:8081/dung` | Reasoning backend URL |
| `ARGUMENTATION_MCP_GRAPH_GEN_URL` | `http://localhost:8082` | Generation backend URL (Phase 2) |
| `ARGUMENTATION_MCP_TIMEOUT_SECONDS` | `30` | Reasoning/generation timeout |
| `ARGUMENTATION_MCP_MAX_REQUEST_BYTES` | `1048576` | Max framework input size / HTTP body |
| `ARGUMENTATION_MCP_CALLER_ID` | `argumentation-mcp` | Identifier sent to the backend |
| `ARGUMENTATION_MCP_GRAPHVIZ_DOT` | `dot` | Graphviz executable used for rendering |
| `ARGUMENTATION_MCP_TRANSPORT` | `stdio` | `stdio` or `http` (overridden by a CLI arg) |
| `ARGUMENTATION_MCP_HTTP_HOST` | `127.0.0.1` | HTTP bind host |
| `ARGUMENTATION_MCP_HTTP_PORT` | `8083` | HTTP bind port |
| `ARGUMENTATION_MCP_STATELESS` | `true` | Stateless Streamable HTTP |
| `ARGUMENTATION_MCP_ALLOWED_HOSTS` | *(SDK localhost)* | Comma list for Host checks; `*` disables (trust proxy) |
| `ARGUMENTATION_MCP_ALLOWED_ORIGINS` | *(SDK localhost)* | Comma list for Origin checks |
| `ARGUMENTATION_MCP_RESOURCE_SERVER_URL` | *(unset)* | Public MCP URL; **required to enable auth** |
| `ARGUMENTATION_MCP_STATIC_TOKEN` | *(unset)* | Shared bearer token (Tier 1 auth) |
| `ARGUMENTATION_MCP_OAUTH_ISSUER` | *(unset)* | OIDC issuer URL (Tier 2 auth) |
| `ARGUMENTATION_MCP_OAUTH_AUDIENCE` | *(= resource URL)* | Expected token audience (Tier 2) |
| `ARGUMENTATION_MCP_OAUTH_JWKS_URL` | *(discovered)* | JWKS endpoint; else found via issuer discovery (Tier 2) |
| `ARGUMENTATION_MCP_OAUTH_ALGORITHMS` | `RS256,ES256` | Accepted JWT signing algorithms (Tier 2) |
| `ARGUMENTATION_MCP_REQUIRED_SCOPES` | *(none)* | Comma list of scopes a token must carry |

## Running (stdio)

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m argumentation_mcp
```

The server speaks MCP over stdio (stdout is MCP frames only; logs go to stderr).
Point an MCP host (Claude Code, MCP Inspector, …) at `python -m argumentation_mcp`
with a reachable `ARGUMENTATION_MCP_DUNG_URL`.

## Running (Streamable HTTP)

```sh
python -m argumentation_mcp http
```

Serves the MCP endpoint at `/mcp` plus `/healthz` (liveness) and `/readyz`
(readiness, including a backend probe), binding to
`ARGUMENTATION_MCP_HTTP_HOST:PORT` (default `127.0.0.1:8083`). Both transports
are built from the same core, so tool names, schemas, and results are identical.
HTTPS terminates at a reverse proxy.

## Authorization

Auth is **off** until `RESOURCE_SERVER_URL` is set together with at least one
credential source. Two tiers are supported (stdio needs no auth — the transport
is local):

**Tier 1 — shared static token (default choice).** Set `STATIC_TOKEN` to a secret
and clients send it as `Authorization: Bearer <token>`. Simple, no identity
provider; rotate by changing the value. Good for a known set of technical clients
(Claude Code, Cursor, Codex, MCP Inspector).

**Tier 2 — OAuth 2.1 / OIDC.** Set `OAUTH_ISSUER` (provider-agnostic). Bearer
tokens are validated as OIDC JWTs: signature via the issuer's JWKS (discovered
from the issuer, or set `OAUTH_JWKS_URL`), plus issuer, audience, and expiry.
Use this when you need per-user login, revocation, or the one-click connector UX.

Either way the HTTP server behaves as a proper resource server: it serves
protected-resource metadata (RFC 9728) at
`/.well-known/oauth-protected-resource/mcp` and answers unauthenticated `/mcp`
requests with a `401` + `WWW-Authenticate` challenge. Both tiers can be enabled
at once (a valid static token *or* a valid JWT is accepted); `REQUIRED_SCOPES`
tightens Tier 2.

## Deployment

The server ships inside the main AgonProject image as an extra process (see the
[`Dockerfile`](../../Dockerfile), [`wrapper_script.sh`](../../deployment/wrapper_script.sh),
and [`Caddyfile`](../../deployment/Caddyfile)):

- runs `python -m argumentation_mcp http` on `127.0.0.1:8083`;
- Caddy proxies `/mcp` and `/.well-known/oauth-protected-resource*` to it;
- reasoning goes to `localhost:8081/dung`, generation to `localhost:8082`,
  rendering to the bundled Graphviz.

Deploy-time configuration is passed via `MCP_*` container env (mapped to
`ARGUMENTATION_MCP_*` in the wrapper): `MCP_STATIC_TOKEN`, `MCP_OAUTH_ISSUER`,
`MCP_OAUTH_AUDIENCE`, `MCP_REQUIRED_SCOPES`, `MCP_RESOURCE_SERVER_URL`,
`MCP_ALLOWED_HOSTS`.

> **The `/mcp` endpoint stays disabled until a credential is set** — an
> unauthenticated public endpoint is never started. The default path is Tier 1:
> set `MCP_STATIC_TOKEN` to a secret and hand it to trusted clients. Switch to
> Tier 2 later by setting `MCP_OAUTH_ISSUER` instead — no code change.

## Tests

```sh
pip install -r requirements-dev.txt
pytest
```

The suite covers the text grammar, the framework contract, the semantics catalog,
the Dung adapter (payload construction, response parsing, timeout/malformed/
unavailable handling — via a mocked backend), the service layer, and the MCP tool
wiring. Live integration against the deployed TweetyProject image is tracked in
the plan doc and not part of this suite.
