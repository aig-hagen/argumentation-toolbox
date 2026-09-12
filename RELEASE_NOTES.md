## Changes

- **Localization (i18n):** the whole UI is now available in English and German. English is
  the default; German can be enabled from settings.
- **Abstract argumentation MCP service:** a new service (under `servers/`) exposes AgonProject's
  abstract argumentation solver over the Model Context Protocol (MCP), so external tools and AI
  assistants can compute extensions and acceptance directly.
- Bumped `js-yaml` and `qs` to patch denial-of-service (DoS) advisories.
