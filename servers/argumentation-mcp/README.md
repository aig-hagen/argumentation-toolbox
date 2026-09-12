# Argumentation MCP Server

An [MCP](https://modelcontextprotocol.io/) server that exposes AgonProject's
abstract argumentation reasoning as typed, agent-friendly tools. Reasoning is
delegated to the existing TweetyProject [`/dung`](../../deployment/Caddyfile)
web service — this server is a stateless, transport-independent adapter around it.

For the full design, contracts, and delivery phases, see
[`docs/mcp-argumentation-service.md`](../../docs/mcp-argumentation-service.md).

## Tools (Phase 1)

| Tool | Purpose |
|---|---|
| `get_capabilities` | Supported semantics, meta-reasoner parameters, operations, backend availability, and configured limits. |
| `enumerate_extensions` | Every extension under a chosen semantics. |
| `check_acceptance` | Credulous or skeptical acceptance, optionally for a queried argument. |

All tools are read-only. Each returns validated `structuredContent` (see the
tool's `outputSchema`) plus a compact text fallback, and reports failures as
`isError` results carrying a stable `{ code, message, retryable }` payload.

`render_framework` and `generate_framework` (Phase 2) are not implemented yet.

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
| `ARGUMENTATION_MCP_TRANSPORT` | `stdio` | `stdio` or `http` (overridden by a CLI arg) |
| `ARGUMENTATION_MCP_HTTP_HOST` | `127.0.0.1` | HTTP bind host |
| `ARGUMENTATION_MCP_HTTP_PORT` | `8083` | HTTP bind port |
| `ARGUMENTATION_MCP_STATELESS` | `true` | Stateless Streamable HTTP |
| `ARGUMENTATION_MCP_ALLOWED_HOSTS` | *(SDK localhost)* | Comma list for Host checks; `*` disables (trust proxy) |
| `ARGUMENTATION_MCP_ALLOWED_ORIGINS` | *(SDK localhost)* | Comma list for Origin checks |

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
HTTPS and authorization are expected to terminate at a reverse proxy; OAuth is a
later phase.

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
