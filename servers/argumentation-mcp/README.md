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
| `ARGUMENTATION_MCP_OAUTH_ISSUER` | *(unset)* | OIDC issuer (authorization server) URL |
| `ARGUMENTATION_MCP_OAUTH_AUDIENCE` | *(= resource URL)* | Expected token audience |
| `ARGUMENTATION_MCP_OAUTH_JWKS_URL` | *(discovered)* | JWKS endpoint; else found via issuer discovery |
| `ARGUMENTATION_MCP_OAUTH_ALGORITHMS` | `RS256,ES256` | Accepted JWT signing algorithms |
| `ARGUMENTATION_MCP_REQUIRED_SCOPES` | *(none)* | Comma list of scopes a token must carry |
| `ARGUMENTATION_MCP_DEV_TOKEN` | *(unset)* | Static bearer token for development |

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

## Authorization (OAuth 2.1 resource server)

Auth is **off** until `RESOURCE_SERVER_URL` is set together with at least one
credential source (`OAUTH_ISSUER` or `DEV_TOKEN`). When enabled, the HTTP server
is a provider-agnostic OAuth 2.1 resource server:

- **Protected-resource metadata** (RFC 9728) is served at
  `/.well-known/oauth-protected-resource/mcp`, pointing at the configured issuer.
- Unauthenticated `/mcp` requests get a `401` with a `WWW-Authenticate` challenge.
- Bearer tokens are validated as **OIDC JWTs**: signature via the issuer's JWKS
  (discovered from `OAUTH_ISSUER`, or set `OAUTH_JWKS_URL`), plus issuer, audience,
  and expiry. A valid, audience-matched token is accepted; `REQUIRED_SCOPES` can
  tighten this. Set the concrete issuer at deploy time — no provider is hardcoded.
- `DEV_TOKEN` enables a static bearer token for local testing / manual clients
  (e.g. MCP Inspector). It is **not** the production contract; leave it unset in
  production.

stdio needs no auth (the transport is local).

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
