# Localization — Implementation Plan

Status: **planned, not yet implemented.** Last updated 2026-08-27.

This document is the implementation tracker for adding German as the second AgonProject
language while establishing an architecture that can support additional languages later. Keep
the checkboxes and status notes current as work progresses.

For repository structure and coding conventions, see [structure.md](./structure.md) and
[conventions.md](./conventions.md). The implementation is a cross-cutting feature and should be
done on a dedicated feature branch.

## Goals

- Keep English as a fully supported language and add complete German localization.
- Allow changing the language at runtime without reloading the app.
- Remember the user's explicit language selection across visits.
- Select a sensible initial language from the browser when no preference has been saved.
- Fall back to English when a translation is missing or a locale bundle cannot be loaded.
- Make adding a future language primarily a translation-content task, not a component refactor.
- Cover desktop, compact/mobile, accessibility labels, notifications, validation feedback,
  tutorials, glossary content, module metadata, evaluation UI, and framework generation.
- Preserve all language-independent identifiers, routes, save formats, exports, and document
  data.
- Prevent locale resources from unnecessarily increasing the initial JavaScript bundle.

## Non-goals and boundaries

- Do not localize route paths in the initial implementation. `/generate`, `/glossary`,
  `/share/:id`, and the other routes remain stable.
- Do not put the locale into shared-document URLs. A recipient's preference should determine the
  interface language.
- Do not translate user-created document names, argument names, imported content, or previously
  persisted data.
- Do not change API field names, serialization discriminators, query parameter values, layout
  enum values, semantics keys, or export file formats.
- Do not translate developer-only exception messages that can never be displayed in the UI.
- Repository documentation is outside the initial app-localization scope.
- Example graph contents remain canonical in the initial implementation. The example picker's
  name and description are localized, but opening an example does not rewrite its argument
  labels based on the current UI language.
- Search-engine-oriented localized URLs and server-side rendering are not required by the
  current SPA architecture. Revisit this only if public indexing becomes a product requirement.

## Current-state inventory

There is currently no localization dependency or application-level locale service.
[`src/main.ts`](/src/main.ts) registers Vue Query and the router and then mounts the app.
[`index.html`](/index.html) has an empty `lang` attribute.

The repository currently contains 76 Vue components and 145 TypeScript files under `src/`.
Heuristic searches find roughly 360 direct template strings and roughly 500 text-like fields in
TypeScript. These numbers include some technical strings, so they are a sizing aid rather than a
translation count.

The user-facing text is distributed across these categories:

| Category | Primary locations | Notes |
|---|---|---|
| App shell and pages | `src/app/` | Home, generate, glossary, share, third-party views; most have separate desktop and mobile shells. |
| Shared editor UI | `src/modules/common/` | Main menu, graph editor chrome, settings, help, export, sharing, windows, forms, notifications. |
| Module UI | `src/modules/*/*.vue` | Link types, probability and condition editors, evaluation windows, module-specific toolbars. |
| Module metadata | `src/modules/*/moduleConfig.ts` | Display names and descriptions are mixed with serialization and editor behavior. |
| Other static metadata | `tags.ts`, `layouting.ts`, semantics and export definitions | Stable identifiers and English labels currently share the same objects. |
| Tutorials | `src/modules/common/tutorial/` and `src/modules/*/tutorials/` | About 1,500 lines; content includes HTML, touch-specific alternatives, glossary references, and behavior. |
| Glossaries | `src/modules/*/glossary.ts` | About 1,400 lines; content includes LaTeX, structured cross-references, and publications. |
| Examples | `src/modules/*/examples.ts` and JSON data | Picker metadata and some graph argument names are English. |
| User-facing errors | Home/generate/share controllers, import errors, evaluation components | Some layers expose raw `Error.message` or backend detail strings. |
| Generator API metadata | `servers/graph-gen/server.py` | Algorithm, framework-type, and parameter descriptions are returned in English. |
| Static fallback page | `public/maintenance.html` | Does not run the Vue application and needs separate handling. |
| Tests | `e2e/*.spec.ts`, colocated unit tests | Existing role and placeholder locators assume English. |

Two architectural details require special treatment:

1. Module configs are marked raw when passed into the application. A translated string resolved
   while constructing a config will not update when the locale changes. Module configs must carry
   stable IDs, and presentation code must derive localized view models reactively.
2. Tutorial and glossary strings cannot simply be fed through a normal message compiler. The
   glossary contains LaTeX braces and pipe characters, while tutorial bodies contain trusted HTML
   and structured tooltip segments. They need typed locale-specific content bundles.

## Chosen architecture

### Localization library

Use `vue-i18n` v11 in Composition API mode:

```ts
createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: { en: englishMessages },
})
```

Install the runtime dependency with `npm install vue-i18n@11`, commit the resulting
`package.json` and `package-lock.json` changes, and register the instance with `app.use(i18n)`
before mounting. Use `useI18n({ useScope: 'global' })` in components and setup-time composables.

Do not rely broadly on implicit `$t` global injection. Prefer an explicit `const { t } =
useI18n(...)` in scripts so translated computed values and TypeScript use remain visible and
testable.

References:

- <https://vue-i18n.intlify.dev/guide/installation>
- <https://vue-i18n.intlify.dev/guide/advanced/composition>
- <https://vue-i18n.intlify.dev/guide/advanced/lazy>

### Locale identifiers

Use language-level locale IDs initially:

```ts
export const SUPPORTED_LOCALES = ['en', 'de'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = 'en'
```

Normalize browser values such as `de-DE`, `de-AT`, and `de-CH` to `de`; normalize other English
variants to `en`. This avoids duplicating identical resources now while leaving room for
regional catalogs later.

Display language names as autonyms so the selector remains understandable in either language:

- English
- Deutsch

### Resource organization

Create the following structure:

```text
src/localization/
├── index.ts                    # i18n instance and application integration
├── locale.ts                   # supported locales, normalization, loading, switching
├── useLocale.ts                # shared reactive locale preference and public switching API
├── types.ts                    # message/content types and recursive translation shape
└── locales/
    ├── en/
    │   ├── index.ts            # exports the complete English locale bundle
    │   ├── messages/
    │   │   ├── common.ts
    │   │   ├── home.ts
    │   │   ├── editor.ts
    │   │   ├── evaluation.ts
    │   │   ├── generate.ts
    │   │   ├── glossary-page.ts
    │   │   └── modules.ts
    │   ├── glossaries/
    │   │   ├── abstract.ts
    │   │   ├── bipolar.ts
    │   │   ├── collective-attacks.ts
    │   │   ├── dialectical.ts
    │   │   ├── incomplete.ts
    │   │   └── probabilistic.ts
    │   └── tutorials/
    │       ├── common.ts
    │       └── <module>.ts
    └── de/
        └── ...                 # identical file and key structure
```

The ordinary `messages` tree is handled by Vue I18n. The glossary and tutorial exports are typed
application data selected by the same locale service. Keeping them in the locale bundle gives a
translator one obvious place to complete a language while avoiding message-parser conflicts with
LaTeX and rich content.

English is the schema and fallback source. Define a recursive mapped type that preserves the
English key structure while widening leaf values to `string`; require each ordinary locale
message tree to satisfy that shape. Add runtime/test validation for structured content whose
shape cannot be expressed conveniently through Vue I18n's message schema.

### Message-key conventions

Keys describe meaning and ownership, not the current English wording:

```text
common.actions.save
common.actions.close
common.states.loading
home.empty.title
home.modules.abstract.name
editor.toolbar.fitToView
editor.links.attack
evaluation.parameters.semantics
evaluation.errors.serviceUnavailable
generate.algorithms.erdosRenyi.description
generate.algorithms.erdosRenyi.params.argumentCount
```

Rules:

- Group by user-facing feature, not by component filename when multiple shells share the copy.
- Reuse a key only when the meaning is genuinely the same. Do not reuse a generic word such as
  `open` when one use means open a file and another means expand a panel.
- Use named interpolation for values: `{fileName}`, `{seconds}`, `{count}`.
- Use Vue I18n pluralization for user-facing counts instead of assembling singular/plural text in
  code.
- Do not use an English sentence as a key.
- Do not construct translated sentences by concatenating fragments. Translate the complete
  sentence so German word order can differ.
- Keep acronyms and proper format names such as AF, ADF, ICCMA, TGF, LaTeX, and SVG unchanged
  unless the terminology review explicitly chooses otherwise.

### Locale selection and persistence

Add a dedicated shared `useLocale()` composable, following the same `useStorage` convention as
the existing settings composable. The Settings UI consumes this composable, while application
bootstrap can initialize localization without coupling the locale lifecycle to the settings
dialog. Use this storage key:

```text
settings:locale
```

Initial selection order:

1. A valid persisted `settings:locale` value.
2. The first supported match in `navigator.languages`.
3. English.

The locale service and composable expose:

```ts
resolveInitialLocale(): SupportedLocale
ensureLocaleLoaded(locale: SupportedLocale): Promise<void>
setLocale(locale: SupportedLocale): Promise<void>
```

`setLocale` must update all of the following as one operation:

- The Vue I18n global locale.
- The persisted setting after the locale bundle loads successfully.
- `document.documentElement.lang`.
- Locale-specific glossary/tutorial content exposed by the locale service.
- Any page title or metadata controlled by the app.

If loading fails, keep the previous locale active and show a translated error. Avoid a partially
switched interface.

Load the English ordinary-message bundle eagerly because it is the fallback. Load non-English
bundles with an explicit Vite-compatible import map. Do not use an unconstrained dynamic import
path. Glossaries and tutorials can be split further by locale and module if bundle measurement
shows a material benefit.

The app should await the selected bundle before mounting to avoid an English-to-German flash on
startup. This is compatible with the existing asynchronous database initialization.

### Stable domain data and localized view models

Do not put `t()` calls into module-level singleton objects. Instead, retain stable IDs in domain
objects and map them to localized computed presentation data inside setup-time controllers or
components.

Planned contract changes:

| Contract | Change |
|---|---|
| `ModuleConfig` | Add a stable `id`. Remove `displayNameSingular` and `description` after consumers migrate. Keep `newNamePrefix`, behavior, routes, serialization, and capabilities unchanged. |
| `ModuleCard` | Build localized `displayNameSingular`, `description`, tag labels, and example metadata in a computed mapper from the current locale. |
| `Tag` | Replace English `name`/`description` constants with stable tag IDs; localize them when rendering/filtering. |
| `LayoutData` | Replace `name` with a stable layout ID or message key; icons and enum values remain unchanged. |
| `LinkConfigs` | Replace `displayName` with a message key or stable relation ID; construct the localized config as a computed value in each editor. |
| `Semantics` and families | Keep backend `key`; derive the display name and description from catalog keys. |
| `ExportConfig` | Add a stable `id`; stop using `name` to locate formats. Localize format labels/descriptions while file extensions and exporters remain unchanged. |
| `Example` | Add a stable `id`; map picker metadata from locale resources. Keep loaded graph data canonical. |
| `Notification` | Store message descriptors (`messageKey` plus interpolation parameters), not finalized English strings. Allow a separate technical-detail field only when needed. |
| Import/user errors | Carry a stable error code plus structured parameters. Translate at the presentation boundary. |

Use a temporary compatibility phase where old display fields remain available if necessary, but
remove them after every consumer has migrated. Do not leave two competing sources of truth.

### Tutorials

Split tutorial mechanics from localized copy.

Stable tutorial definitions retain:

- Tutorial and step IDs.
- Anchor names and placements.
- `advanceOn` behavior.
- Advance conditions.
- Follow-up tutorial IDs.
- Touch-versus-pointer selection logic.

Locale content retains:

- Tutorial name and description.
- Step titles.
- Default and touch-specific bodies.
- Inline glossary labels while keeping tooltip IDs stable.

Introduce a builder that combines one stable definition with the selected locale's copy and
validates that every expected step ID is present exactly once. Update tutorial state to store the
active tutorial ID and step index rather than a locale-specific tutorial object. This allows the
currently open tutorial to update immediately when the language changes and preserves the
existing locale-independent completion IDs in local storage.

Tutorial bodies currently render trusted HTML. Keep all HTML in repository-owned typed content;
never interpolate untrusted user or server text into it. Use component interpolation for normal
component markup instead of creating additional `v-html` sites.

### Glossaries

Keep glossary term keys and cross-reference targets stable across languages. Each locale exports
a complete `TooltipRegistry` for each module, preserving publication objects and term references
while translating labels, titles, and content.

Change glossary provision and consumption so the active registry is reactive. The current plain
`TooltipRegistry` injection should become a computed/read-only ref or a locale-aware registry
service. The standalone glossary page must likewise compute its module list and combined term map
from the selected locale.

Add validation that:

- English and German contain the same glossary term IDs.
- Every `{ ref: ... }` target resolves in the combined registry.
- Required labels and content are non-empty.
- Publication references remain valid objects.
- Search and sorting operate on localized labels/titles.

Use `Intl.Collator(locale)` for glossary sorting. Use locale-aware case folding consistently for
search. Keep query parameters such as `module=AF` and `term=charFunction` stable when switching
languages.

### Generator API metadata

The graph-generation API returns stable IDs and English descriptions. Keep the IDs as the
contract and localize known framework types, algorithms, and parameters in the frontend:

```text
generate.frameworkTypes.abstract.description
generate.algorithms.erdosRenyi.description
generate.algorithms.erdosRenyi.params.n.label
generate.algorithms.erdosRenyi.params.n.description
```

The backend may retain its English descriptions for API documentation and compatibility, but the
AgonProject UI should not display them for known IDs. For an unknown future algorithm or
parameter, fall back to a readable formatted ID and then the server description rather than
showing a raw translation key.

Prefer structured backend error codes for expected failures. Until the API provides them, map
known HTTP statuses and local timeout conditions to localized errors, and treat an unknown server
detail as optional technical detail under a localized generic failure heading.

Do not add locale negotiation to the generator API in the initial implementation. Centralizing
presentation strings in the frontend avoids splitting each language across TypeScript and Python.

### Numbers and generated output

Use Vue I18n/`Intl.NumberFormat` for human-readable values such as probability text, counts, and
timings where locale formatting is beneficial. Keep machine-readable and reproducible output
locale-neutral:

- JSON, ICCMA, TGF, and LaTeX export syntax is unchanged.
- File names and extensions are unchanged except for existing user-controlled document names.
- Backend request numbers remain JSON numbers.
- Parser input and acceptance-condition syntax remain language-independent.
- Do not replace decimal points inside exported data with German decimal commas.

## Phased implementation

Each phase should leave the app buildable and should update this document's checkboxes and status.
Do not combine all extraction and German translation into one unreviewable change.

### Phase 0 — Baseline and translation inventory

- [ ] Create a dedicated localization feature branch from the intended integration branch.
- [ ] Record the current successful `type-check`, unit-test, lint, build, and E2E baselines,
  including any pre-existing failures.
- [ ] Generate a working inventory of visible strings grouped by feature and mark each as:
  translatable UI, translatable domain content, stable technical term, user data, or developer-only.
- [ ] Confirm the German terminology owner/reviewer for formal argumentation vocabulary.
- [ ] Agree on terminology for the recurring concepts listed in the terminology section below.
- [ ] Decide whether `public/maintenance.html` must ship German in the same release or can follow
  immediately afterward.
- [ ] Measure the current production bundle so locale loading can be evaluated later.

Deliverable: reviewed inventory and terminology decisions, with no runtime behavior change.

### Phase 1 — Localization foundation

- [ ] Install `vue-i18n@11` and register a Composition API instance before app mount.
- [ ] Add `src/localization/` with supported locale types, English fallback messages, locale
  normalization, explicit lazy loaders, and locale switching.
- [ ] Add a shared `useLocale()` composable with a persisted preference, validation, and
  browser-language detection; expose it through the Settings UI.
- [ ] Await the selected locale before mounting so startup does not flash in English.
- [ ] Synchronize the `<html lang>` attribute on startup and every change.
- [ ] Change the static default in `index.html` from an empty language to English for pre-mount and
  failure states.
- [ ] Add the language selector to Settings in both presentation modes that expose settings.
- [ ] Handle locale-load failure without changing the active locale.
- [ ] Add unit tests for locale normalization, initial selection precedence, persistence, fallback,
  loading success/failure, and `lang` synchronization.
- [ ] Add message-schema parity tests between English and German, initially with a minimal German
  catalog.

Deliverable: switching between English and German works for a small proof set of settings/shell
labels, persists across reloads, and falls back safely.

### Phase 2 — Shared shell and common components

Extract and translate the shared application vocabulary before module-specific content:

- [ ] Main menu and compact editor menu.
- [ ] Settings, theme, graph defaults, tutorial settings, and all control accessibility labels.
- [ ] Home/document navigation: document actions, new-document picker headings, empty states,
  rename/delete confirmation text, tab placeholders, and share states.
- [ ] Shared graph editor toolbar, mobile top/bottom bars, relayout controls, link-switch labels,
  undo/redo hints, physics/grid states, and contextual actions.
- [ ] Shared window and bottom-sheet titles, close buttons, drag/control labels, and empty states.
- [ ] Export picker, format screens, style options, save/copy feedback, and accessible labels.
- [ ] Help controls, gestures, links, settings/help/tutorial window shells.
- [ ] Share modal and quick-share feedback.
- [ ] Notification display accessibility copy.
- [ ] Generic form labels and grouped-select empty/default states.
- [ ] Third-party attribution page chrome; do not translate library names, licenses, or attribution
  text supplied by third parties.
- [ ] Ensure separate desktop and mobile shells use the same message keys for equivalent actions.

Deliverable: all shared chrome can be used in German, with English fallback and no translated
values leaking into persisted state.

### Phase 3 — Stable metadata contracts

- [ ] Add stable IDs to `ModuleConfig`, `Tag`, `ExportConfig`, and `Example` where missing.
- [ ] Replace module display fields with reactive localized module-card view models.
- [ ] Migrate module card filtering/search to stable tag IDs and localized display text.
- [ ] Replace layout names with localized labels while retaining existing `Layout` enum values.
- [ ] Replace graph link `displayName` constants with locale-aware computed configs.
- [ ] Localize semantics and semantics-family labels while retaining backend keys.
- [ ] Replace export-format name comparisons with stable export IDs before localizing display names.
- [ ] Localize example picker names/descriptions without changing loaded graph data.
- [ ] Remove deprecated English display fields after all consumers migrate.
- [ ] Add tests showing that switching locale updates already-mounted module cards, menus, relation
  selectors, semantics selectors, and export pickers.

Deliverable: application/domain configuration is presentation-neutral, and live switching works
without remounting editors or rewriting documents.

### Phase 4 — Route pages and module-specific UI

- [ ] Home desktop and mobile surfaces.
- [ ] Generate desktop and mobile views, including results, warnings, limits, and action labels.
- [ ] Glossary desktop and mobile page chrome, search placeholders, empty states, and navigation.
- [ ] Share-loading view and expired/error states.
- [ ] Third-party desktop and mobile views.
- [ ] Abstract argumentation editor and extension/ranking/serialisation windows.
- [ ] Bipolar argumentation editor and evaluation windows.
- [ ] Incomplete argumentation editor, certainty controls, and evaluation windows.
- [ ] Probabilistic argumentation editor, probability controls, and evaluation windows.
- [ ] Dialectical argumentation condition editor, formula keypad labels, and interpretation window.
- [ ] Collective-attacks editor and evaluation windows.
- [ ] Localize titles, tooltips, placeholders, option labels, status messages, screen-reader labels,
  and contextual menus in every module.
- [ ] Review German text expansion in narrow mobile headers, buttons, chips, and bottom sheets.

Deliverable: all interactive UI except long-form tutorial/glossary copy is available in German.

### Phase 5 — Notifications, validation, and server failures

- [ ] Introduce a typed message descriptor for notifications (`messageKey` plus named parameters).
- [ ] Migrate home-controller file loading, saving, sharing, and clipboard notifications.
- [ ] Replace import-error finalized messages with error codes and structured data.
- [ ] Decide how to present Zod's detailed validation paths: localized wrapper plus technical detail,
  or a custom German issue formatter. Do not claim full German validation while displaying an
  unexplained English Zod message as the primary text.
- [ ] Map evaluation timeout, rate-limit, unavailable-service, and generic failures to localized
  messages.
- [ ] Map generator timeouts and known HTTP statuses to localized messages.
- [ ] Map share-service known failures to localized messages.
- [ ] Keep programmer errors, invariant violations, and console diagnostics outside translation
  catalogs.
- [ ] Test interpolation with file names and other user data, ensuring values are escaped safely.
- [ ] Test that unknown backend errors use a localized generic heading and do not expose unsafe
  markup.

Deliverable: every expected user-facing failure has an English and German presentation while
diagnostic information remains useful.

### Phase 6 — Generator metadata

- [ ] Add English and German catalog entries for every framework type.
- [ ] Add entries for every registered generation algorithm.
- [ ] Add contextual labels/descriptions for every algorithm and framework-type parameter.
- [ ] Replace `formatAlgorithmName` and `formatParamLabel` for known IDs with localized lookup.
- [ ] Retain readable fallbacks for unknown future IDs.
- [ ] Stop rendering backend English descriptions for known entries.
- [ ] Verify parameter values and request payloads are unchanged in both locales.
- [ ] Add contract tests that registered backend IDs are covered by the frontend English catalog;
  require German parity through the locale-shape test.

Deliverable: the complete random-generation workflow is German without changing its API contract.

### Phase 7 — Tutorials

- [ ] Define stable tutorial mechanics and locale-copy types.
- [ ] Change active tutorial state to store stable IDs rather than locale-specific objects.
- [ ] Add the definition/copy builder and structural validation.
- [ ] Move existing English common tutorials into the English locale bundle without wording
  changes in the first pass.
- [ ] Move all module tutorials into English locale bundles.
- [ ] Add reviewed German common tutorials.
- [ ] Add reviewed German tutorials for AF, BAF, ADF, iAF, PAF, and SetAF.
- [ ] Preserve all action-advance conditions, anchors, touch alternatives, follow-up links, and
  completion IDs.
- [ ] Verify language switching during an active tutorial updates its copy without losing the
  current step.
- [ ] Verify inline glossary tooltip IDs resolve in both languages.
- [ ] Audit trusted HTML and ensure no user/server values are inserted through `v-html`.

Deliverable: every tutorial can be completed in either language with identical behavior.

### Phase 8 — Glossaries

- [ ] Make tooltip-registry provision reactive to locale changes.
- [ ] Move every existing English glossary into the English locale bundle without changing term
  IDs or reference structure.
- [ ] Add German registries for AF/ranking, BAF, ADF, iAF, PAF, and SetAF.
- [ ] Translate standalone glossary module labels and all term labels, titles, and definitions.
- [ ] Preserve LaTeX exactly where mathematical notation is language-independent.
- [ ] Validate cross-references and publication references for both languages.
- [ ] Use locale-aware sorting and search.
- [ ] Verify that a glossary URL continues to identify the same concept after a language switch.
- [ ] Review all German definitions with a formal-argumentation domain expert.
- [ ] Decide explicitly how existing `TODO` glossary definitions are treated; do not invent a
  German definition where the English source is intentionally incomplete.

Deliverable: complete, structurally valid English and German glossary experiences.

### Phase 9 — Static surfaces, formatting, and cleanup

- [ ] Localize `public/maintenance.html` separately from Vue I18n, using a small self-contained
  English/German mechanism that works while the application is unavailable.
- [ ] Review page/document titles and any visible static metadata.
- [ ] Apply locale-aware formatting to human-readable probabilities, counts, and durations where
  appropriate; verify exports remain canonical.
- [ ] Search the frontend for remaining visible English literals and classify each intentional
  exception.
- [ ] Remove temporary compatibility fields, fallbacks, and migration comments.
- [ ] Document how contributors add a key, update structured content, and add a new locale.
- [ ] Consider `@intlify/unplugin-vue-i18n` for message precompilation and
  `@intlify/eslint-plugin-vue-i18n` for catalog/template linting after the base integration is
  stable; add them only if they materially improve the repository checks.
- [ ] Measure production chunks and ensure German/rich content is not part of the initial English
  bundle unless intentionally required.

Deliverable: no unclassified user-facing English remains, static fallback surfaces are covered,
and contributor documentation is complete.

## Testing and verification strategy

### Unit tests

- Locale normalization and browser preference matching.
- Saved preference precedence and invalid-value fallback.
- Locale-loader idempotence, concurrent calls, success, and failure behavior.
- English/German ordinary-message key parity.
- Placeholder parity: both languages must use the same named interpolation parameters.
- Glossary term parity and cross-reference integrity.
- Tutorial ID/step parity and definition/copy composition.
- Stable-ID-to-message mapping for modules, tags, layouts, relations, semantics, exports,
  examples, algorithms, and parameters.
- Error-code mapping and parameter interpolation.
- Locale-aware sorting where behavior differs from the current implicit locale.

### Component tests

- Language selector changes visible text immediately.
- The selector persists and restores the choice.
- `html[lang]` follows the selection.
- Already-mounted editor and evaluation components react to language changes.
- Desktop and mobile presentations expose the same translated actions.
- Form values and stable option values do not change when labels change.
- Tutorial and glossary components switch content without losing stable state.
- Accessibility names are translated along with visible labels.

### End-to-end tests

Tests must establish locale explicitly rather than depending on the CI browser's language.

- English landing/editor smoke flow.
- Switch to German and verify representative navigation, settings, editor, evaluation, export,
  generator, glossary, and tutorial text.
- Reload and confirm German persists.
- Change back to English and confirm persistence updates.
- Open a shared link in a German-preferred context and confirm document content is unchanged while
  interface chrome is German.
- Import and invalid-import flows in both languages.
- Compact/mobile German smoke flow at the configured mobile viewport.
- Missing-key fallback test using a controlled fixture rather than shipping an intentionally
  missing German production key.

Existing Playwright role/placeholder assertions must either set English explicitly or use stable
test IDs only where a language-independent locator is genuinely required. Prefer accessible role
locators for language-specific behavior because they verify the localized accessibility surface.

### Required commands per implementation batch

Follow the repository's existing rules and do not start the development server for verification:

```sh
npm run format
npm run lint
npm run type-check
npm run test:unit -- --run
npm run build
npm run test:e2e
```

If an existing baseline failure prevents a command from passing, record it in this document and
demonstrate that the localization batch did not introduce an additional failure.

## German terminology checklist

The following terms appear repeatedly and must be translated consistently across module cards,
tooltips, tutorials, semantics selectors, and the glossary. Record the agreed translations before
bulk translation starts:

- argument / attack / support
- argumentation framework
- abstract, bipolar, incomplete, probabilistic, dialectical
- collective attack
- acceptance condition / interpretation
- semantics / extension
- admissible / complete / grounded / preferred / stable / ideal
- credulous / skeptical acceptance
- possible / necessary acceptance
- ranking semantics
- serialisation / sequence / reduct / initial set
- certain / uncertain argument or attack
- probability / completion
- relayout / fit to view / physics / snap to grid

Prefer terminology established in German-language publications or teaching material from the
project's domain experts. Preserve recognized English acronyms alongside a German expansion where
that helps users connect the UI to the literature.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Locale switching does not update raw configs | Store stable IDs and build translated values in computed view models; test already-mounted editors. |
| English and German catalogs drift | Compile-time shape checks plus explicit parity tests in CI. |
| Tutorial behavior is duplicated in translations | Keep behavior in one stable definition and localize copy only. |
| LaTeX is interpreted as message syntax | Keep glossary/tutorial rich content in typed locale data, outside Vue I18n's ordinary message compiler. |
| Unsafe translated HTML | Use component interpolation for normal UI; allow repository-owned trusted tutorial markup only; never insert untrusted values through `v-html`. |
| Backend English leaks into German UI | Map stable IDs/statuses to client catalog keys and define an explicit unknown-error fallback. |
| German labels overflow compact layouts | Review representative longest strings at mobile viewport widths and allow wrapping where necessary. |
| Translation changes persisted or exported data | Translate only presentation fields; add tests comparing serialized/exported output across locales. |
| Locale bundles enlarge first load | Eager-load English fallback only, lazy-load other locales, measure production chunks, and split rich content if needed. |
| Scientific terminology is inconsistent | Establish a terminology list and require domain-expert review of tutorials and glossaries. |
| Existing user settings contain invalid locale values | Validate stored values and fall back through browser selection to English. |

## Recommended pull-request breakdown

1. **Foundation:** dependency, locale service, persistence, selector, `html[lang]`, minimal tests.
2. **Shared UI:** app shell/common components and German core vocabulary.
3. **Stable metadata:** module/tag/layout/link/semantics/export/example refactors.
4. **Feature UI:** route pages, all module-specific editors/evaluation windows, generator metadata.
5. **Errors:** notifications, imports, evaluation/share/generator failures.
6. **Tutorials:** behavior/copy split plus English and German content.
7. **Glossaries:** reactive registries plus reviewed German scientific content.
8. **Polish:** maintenance page, number formatting, untranslated-string audit, bundle measurement,
   contributor documentation.

Each PR should update the phase checklist in this document. Avoid committing automatic German
translations of scientific content without review merely to make key-parity tests pass; use the
English fallback during development and complete the German catalog before declaring the phase
done.

## Definition of done

Localization is complete when all of the following hold:

- [ ] English and German are selectable at runtime and persist across visits.
- [ ] A first-time German browser starts in German; unsupported browsers start in English.
- [ ] `html[lang]` and app-controlled page titles match the active language.
- [ ] All desktop and mobile user-facing UI, accessibility labels, notifications, and expected
  errors are localized.
- [ ] Module metadata, generator metadata, tutorials, and glossary content are localized.
- [ ] German tutorials and glossary terminology have domain-expert approval.
- [ ] Stable routes, save files, API payloads, document content, and exports are unchanged by
  locale selection.
- [ ] Catalog parity, structured-content integrity, unit, build, type-check, lint, and E2E checks
  pass.
- [ ] No unclassified visible English literal remains in the German interface.
- [ ] Locale bundles meet the agreed initial-load budget.
- [ ] Contributor documentation explains how to add translations and a future locale.
