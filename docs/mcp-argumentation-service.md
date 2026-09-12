# Implementation Plan — Abstract Argumentation MCP Service

> Status: **IN PROGRESS**. The local reasoning slice (Phase 0 + most of Phase 1,
> stdio transport only) is implemented under
> [`servers/argumentation-mcp/`](../servers/argumentation-mcp/). Streamable HTTP,
> OAuth, rendering, generation, and deployment are still open. Track progress by
> checking off tasks in the phase sections below.

## 1. Goal

Expose abstract argumentation reasoning as a small, stable set of MCP (Model Context
Protocol) tools so different MCP hosts and AI agents can:

- enumerate extensions under extension-based semantics;
- check credulous or skeptical acceptance;
- render an abstract argumentation framework; and
- generate abstract argumentation frameworks for examples and experiments.

Target hosts include Claude Code, Claude remote connectors, Codex, Cursor, MCP Inspector,
and SDK-based MCP clients.

Reasoning is delegated to AgonProject's existing TweetyProject `/dung` web service.
Rendering uses Graphviz and generation uses the existing graph-gen service. The MCP
server is a typed, agent-friendly adapter around those components.

## 2. Scope

### In scope

- Abstract argumentation frameworks with arguments and binary attacks.
- Extension enumeration through `/dung` `get_models`.
- Credulous and skeptical acceptance through `/dung` `get_credulous` and
  `get_skeptical`.
- All extension semantics and optional reasoner parameters supported by the deployed
  `/dung` backend.
- Graphviz rendering with optional argument highlighting.
- Abstract-framework generation through graph-gen.
- Local stdio and hosted Streamable HTTP transports.

### Not currently in scope

- SETAF, bipolar, incomplete, probabilistic, or dialectical argumentation.
- Ranking semantics.
- Serialisation semantics.
- Reimplementing any TweetyProject solver.
- Exposing TweetyProject as a general-purpose public API.

The service can be extended later, but the first released contracts should stay focused
on abstract argumentation.

## 3. Compatibility target

- Use the official Python `mcp` SDK and pin the tested version in a lockfile.
- Target MCP `2026-07-28` and the legacy `2025-11-25` lifecycle used by older clients.
  Let the SDK negotiate or detect the protocol era.
- Expose identical tool names, schemas, behavior, and result shapes over **stdio** and
  **Streamable HTTP**.
- Treat structured JSON plus text content as the interoperability baseline. Image output
  is an enhancement and must not be required to understand a reasoning result.
- Keep requests stateless and independent.

## 4. Naming and versioning

Working package/server name: `argumentation-mcp`. The final display name may change
before the first release, but published tool names must then remain stable.

Structured results include a `schema_version` and `service_version`. Breaking domain
contract changes require a schema major version or a new tool name; MCP protocol
negotiation does not version the argumentation contracts.

## 5. Architecture

```text
         MCP host / AI agent
                  │
         stdio or Streamable HTTP
                  │
     ┌────────────▼─────────────────────┐
     │ argumentation-mcp                │
     │  MCP definitions + instructions │
     │  input validation / text parser │
     │  Dung backend adapter           │
     │  result normalization           │
     │  Graphviz renderer              │
     └────────────┬───────────┬─────────┘
                  │           │
          TweetyProject     graph-gen
             /dung          /generate
```

### Principles

- Tool handlers call transport-independent application services.
- The MCP boundary uses argument names, never TweetyProject's one-based indices.
- Backend response strings are parsed and validated before being returned.
- The same input and output contracts work locally and remotely.
- No tool result depends on a filesystem path visible only to the server.
- The MCP project does not import the Vue application. It owns its Python schemas,
  parsers, fixtures, and backend contract tests.

## 6. Tool surface

### `get_capabilities`

Returns:

- supported semantics;
- optional parameters for meta-reasoners;
- supported reasoning operations;
- available generation algorithms and their parameters;
- whether the reasoning, rendering, and generation backends are available; and
- configured timeout and request-size limit.

Semantics and reasoner parameters should be derived from the deployed backend where
possible rather than maintained as an unrelated hard-coded list.

### `enumerate_extensions`

Computes every extension under a selected semantics.

Inputs:

- framework in structured or terse text form;
- semantics key; and
- optional semantics-specific arguments.

Returns named extensions:

```json
{
  "schema_version": "1",
  "service_version": "0.1.0",
  "semantics": "PR",
  "extensions": [["a"], ["b", "c"]],
  "solver_time_ms": 12
}
```

### `check_acceptance`

Computes credulous or skeptical acceptance.

Inputs:

- framework in structured or terse text form;
- semantics key;
- mode (`credulous` or `skeptical`);
- optional argument name to query; and
- optional semantics-specific arguments.

The result always has one shape: `accepted_arguments` contains the complete returned
set, and `query` is either `null` or contains the requested argument and a boolean.

### `render_framework`

Renders a framework with optional `highlight_arguments`.

- PNG is returned as MCP `ImageContent`.
- Structured metadata and a concise text fallback accompany the image.
- SVG may be added as an embedded resource after client compatibility testing.
- Rendering failure does not affect the reasoning tools.

### `generate_framework`

Generates an abstract framework using graph-gen and returns it in the same canonical
structured format accepted by the other tools. Algorithm parameters are obtained through
`get_capabilities`.

All tools are computational/read-only and receive the MCP `readOnlyHint`. Deterministic
tools also receive `idempotentHint`; generation is only described as reproducible when
the selected algorithm receives a seed.

## 7. Framework contract

For this abstract-only service, an argument's name is its canonical identifier. A separate
`id` and display `label` are deliberately not used.

```json
{
  "arguments": ["a", "b", "c"],
  "attacks": [
    { "source": "a", "target": "b" },
    { "source": "b", "target": "c" }
  ]
}
```

Rules:

- argument names are non-empty strings and unique within the framework;
- attack endpoints must exactly match declared argument names;
- duplicate arguments, duplicate attacks, and unknown endpoints are validation errors;
- argument order has no semantic meaning, although it is used to create a deterministic
  name-to-index mapping for the backend; and
- outputs contain the original argument names.

Names do not need separate labels because duplicate display names have no useful meaning
in the current domain. If a future UI requires duplicate labels, a separate identifier can
be introduced in a future schema version.

### Terse text form

The existing chat-friendly line format remains supported:

```text
a
b
c
a -> b
b -> c
```

The exact text grammar, allowed characters, comments, and escaping rules are documented
and tested before release. Duplicate names and references to undeclared arguments are
rejected. Each framework-consuming tool accepts exactly one of `framework` or
`framework_text`.

## 8. Results and errors

Every successful reasoning result provides:

- validated `structuredContent` conforming to the tool's `outputSchema`;
- a compact text representation for clients that do not consume structured results;
- argument names rather than backend indices;
- semantics and mode where applicable; and
- solver duration.

Tool-execution failures use `isError: true` with a stable structured error:

```json
{
  "code": "BACKEND_TIMEOUT",
  "message": "Reasoning exceeded the configured timeout.",
  "retryable": true
}
```

Use distinct codes for invalid frameworks, unsupported semantics, invalid reasoner
parameters, backend timeout, backend unavailability, malformed backend responses, render
failure, and generation failure. Do not expose internal URLs, stack traces, or subprocess
stderr.

## 9. Dung backend adapter

The adapter owns payload construction, name-to-index mapping, response parsing, and
validation.

| Operation | Backend command | Backend answer | MCP result |
|---|---|---|---|
| Enumerate extensions | `get_models` | list-of-sets string | array of named extensions |
| Credulous acceptance | `get_credulous` | set string | named accepted arguments |
| Skeptical acceptance | `get_skeptical` | set string | named accepted arguments |

Backend request payloads include `nr_of_arguments`, one-based attack pairs, semantics,
optional reasoner `args`, timeout, timeout unit, and the backend's required caller field.

Most responses use
`{ time: number, answer: string|null, status?: string }`. Treat `TIMEOUT` and error
statuses explicitly, fail closed on unknown indices, and never pass the raw `answer`
string through to MCP clients.

### Contract tests

- Port representative abstract-framework fixtures into the MCP project.
- Cover empty frameworks, self-attacks, cycles, duplicate names, Unicode names, empty
  extension sets, invalid semantics, timeout responses, and malformed backend answers.
- Run integration tests against the TweetyProject image/version used in production.
- Verify every advertised semantics and supported operation.

## 10. Rendering and generation

### Rendering

- Generate DOT internally without invoking a shell.
- Invoke Graphviz with a fixed executable and argument list.
- Return bytes inline rather than writing caller-visible files.
- Use a deterministic layout where practical.
- Clearly distinguish highlighted arguments without changing the framework itself.

### Generation

- Query graph-gen's `/algorithms` endpoint for available algorithms and parameter schemas.
- Call `/generate` with `framework_type: "abstract"`.
- Convert generated numeric arguments into deterministic names and return the canonical
  framework contract.
- Pass an explicit seed through when supported so callers can request reproducible output.

## 11. Transport and authorization

### Stdio

- Use stdin/stdout exclusively for MCP frames and send logs to stderr.
- Read backend URLs and credentials from environment variables.
- Document how to use an existing local AgonProject backend, the bundled container, or an
  explicitly configured remote backend.
- Report unavailable Graphviz or graph-gen through `get_capabilities` rather than failing
  server startup.

### Streamable HTTP

- Serve the MCP endpoint at `/mcp`.
- Prefer stateless operation while retaining SDK-provided compatibility with legacy
  initialized clients.
- Terminate HTTPS at Caddy and configure the SDK's host/origin transport checks.

### Authorization

The production HTTP service is an OAuth 2.1 resource server backed by an external
OAuth/OIDC authorization server. It provides protected-resource and authorization-server
discovery, validates issuer/scope/audience/expiry, and returns correct authentication
challenges. A static bearer token may be enabled for development and manually configured
clients, but is not the production connector contract.

The concrete production OAuth/OIDC provider is selected before deployment. Phase 1 can
use a standards-compliant test provider.

## 12. Basic limits and operations

Keep service-level configuration deliberately small:

- **Timeout:** one configurable reasoning/generation timeout, defaulting to 30 seconds.
- **Request limit:** one configurable maximum MCP/HTTP request-body size, defaulting to
  the existing Caddy limit of 1 MB.

The MCP service enforces both limits even when called internally. The public endpoint
retains authentication and Caddy's basic rate limit. More granular framework, output, or
per-operation limits should only be added if observed workloads make them necessary.

Provide lightweight liveness and readiness endpoints and structured, redacted logs with
the tool name, duration, backend status, and error code. Do not log complete frameworks or
credentials by default.

## 13. Deployment

The initial production deployment follows the repository's current single-image,
multi-process pattern:

- run the MCP server on `127.0.0.1:8083`;
- add Graphviz and pinned Python dependencies to the runtime image;
- proxy `/mcp` and required OAuth metadata routes through
  [Caddy](../deployment/Caddyfile);
- call TweetyProject internally on `localhost:8081/dung`; and
- call graph-gen internally on `localhost:8082`.

The intended public MCP endpoint is
`https://agonproject.aig.fernuni-hagen.de/mcp`.

## 14. Delivery phases

### Phase 0 — Freeze the MVP contracts

- [ ] Confirm the package/server display name before first release. (Working name: `argumentation-mcp`.)
- [x] Commit the structured framework, text grammar, tool input, result, and error schemas.
- [x] Commit stable tool names, descriptions, annotations, and concise server instructions.
- [x] Pin the Python MCP SDK and TweetyProject backend versions. (`mcp==2.2.0`; backend via the pinned submodule.)
- [x] Add Dung parser and adapter fixtures.

### Phase 1 — Cross-client reasoning slice

- [x] Scaffold the transport-independent Python service.
- [ ] Expose stdio and Streamable HTTP from the same core. (stdio done; HTTP pending.)
- [x] Implement `get_capabilities`.
- [x] Implement structured and terse framework input.
- [x] Implement `enumerate_extensions` and `check_acceptance`.
- [x] Return validated structured results plus text fallbacks.
- [ ] Implement production-shaped OAuth resource-server behavior for HTTP.
- [ ] Pass MCP conformance tests for `2026-07-28` and `2025-11-25`.
- [ ] Smoke-test with Claude Code, a Claude remote connector, Codex, and Cursor.

### Phase 2 — Rendering and generation

- [ ] Implement `render_framework` with PNG `ImageContent`, metadata, and text fallback.
- [ ] Verify image behavior in each target client.
- [ ] Integrate graph-gen discovery into `get_capabilities`.
- [ ] Implement abstract-only `generate_framework`.
- [ ] Verify generated frameworks can be passed directly to reasoning and rendering tools.

### Phase 3 — Deployment and release

- [ ] Select and configure the production OAuth/OIDC provider.
- [ ] Add the MCP process and Graphviz to the existing image/startup supervision.
- [ ] Add Caddy MCP and OAuth metadata routes.
- [ ] Enforce the configured timeout and request-size limit.
- [ ] Add health checks and redacted logs.
- [ ] Verify the public endpoint from Claude, Codex, and Cursor.
- [ ] Publish setup examples, tool examples, schemas, errors, and the tested compatibility
      matrix.

## 15. Release acceptance

Before release:

- the same reasoning fixtures pass over stdio and Streamable HTTP;
- structured and terse inputs produce identical canonical results;
- the server passes current and legacy MCP conformance tests;
- OAuth discovery and login work from at least Claude and Codex;
- generated frameworks work as direct inputs to reasoning and rendering; and
- clients without image rendering still receive useful render metadata and text.

## 16. Remaining decisions

No decision below blocks implementation of the local reasoning MVP:

- Final public display/package name, before the first release.
- Production OAuth/OIDC provider, before deployment.
