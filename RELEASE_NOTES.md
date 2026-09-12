## Changes

- **Faster page loads:** TikZJax (the in-browser LaTeX/TikZ renderer) now loads on demand
  instead of on every page load, so visits that never render TikZ no longer pay for it.
- **Public MCP endpoint:** the abstract argumentation MCP service now runs unauthenticated by
  default — it is read-only computation over the already-public solver, throttled by a per-IP
  rate limit. Authentication can be re-enabled via configuration without a code change.
