## Changes

- **MCP `render_framework` temporarily disabled:** the PNG-rendering tool is now behind a
  feature flag (off by default), so it no longer appears in the argumentation MCP tool list.
  It can be re-enabled via configuration without a code change.
- **Stronger nudge toward the solver:** the `enumerate_extensions` and `check_acceptance`
  tool descriptions (and the server instructions) now explicitly steer clients to use the
  tools instead of reasoning about a framework by hand whenever it can be expressed as input.
