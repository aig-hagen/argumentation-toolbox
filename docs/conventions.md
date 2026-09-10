# Conventions

This is an overview of the coding conventions and recurring patterns used across the app. For how the repository is laid out, see [structure.md](./structure.md); for how to extend it, see [extending.md](./extending.md).

## License headers

Every source file (`.ts`, `.vue`, `.css`) starts with a GPL-3.0 license header comment. Headers are inserted and checked by [`license-check-and-add`](/scripts/check-license-header.json), run via:

```sh
npm run license-headers
```

This also runs automatically as the first step of `npm run lint`. Don't hand-write the header on new files — run this command and let it insert one.

## Formatting & linting

- [Prettier](https://prettier.io/) formats the code: no semicolons, single quotes, 100-character print width (see [`.prettierrc.json`](/.prettierrc.json)). Run `npm run format`.
- Linting is layered: `oxlint` (fast correctness checks, see [`.oxlintrc.json`](/.oxlintrc.json)) then `eslint` (Vue + TypeScript rules, import sorting). Run `npm run lint`.
- Imports are auto-sorted by `eslint-plugin-simple-import-sort` — don't hand-order import groups, let `--fix` do it.
- **No relative imports within `src/`.** `eslint-plugin-no-relative-import-paths` enforces the `@/*` alias (mapped to `src/*` in `tsconfig.app.json`) instead of `../../` paths:

  ```ts
  import { useSettings } from '@/modules/common/settings/useSettings'
  ```

## TypeScript

- Prefer `interface` for object shapes (component props, data records, `TooltipDefinition`, `DocumentState<T>`), and `type` for unions, aliases, and derived types (`GraphStyleName = 'default' | 'high-contrast' | ...`, `type Save = z.infer<typeof SaveSchema>`).
- Avoid `any`; when working with genuinely untyped input (deserializing untrusted data), type as `unknown` and narrow, or suppress a single line with `// @ts-expect-error <TS code>: <reason>` — never bare `@ts-ignore`. The comment must explain _why_ the suppression is safe (e.g. "ignore because we deserialize").
- Runtime-validated data (the save-file format) is defined with a [`zod`](https://zod.dev/) schema, with the TypeScript type derived from it via `z.infer<typeof Schema>` rather than declared separately — see [`saveFormat.ts`](/src/modules/abstract-argumentation/save/saveFormat.ts).

## Vue components

- Always `<script setup lang="ts">`. No Options API.
- Props are declared with the type-only generic form of `defineProps`, destructured with inline defaults (relies on the Vue 3.5+ reactive-props-destructure feature) rather than `withDefaults`:

  ```ts
  const { title, active = false } = defineProps<{
    title: string
    active?: boolean
  }>()
  ```

- Emits use the type-only `defineEmits<{ eventName: [payloadType] }>()` form.
- Two-way bindable props use `defineModel()` (see [`FloatingWindow.vue`](/src/modules/common/window/FloatingWindow.vue)) instead of manual `modelValue`/`update:modelValue` prop+emit pairs.
- Component files are `PascalCase.vue`. Floating result/tool windows are named `Window*.vue` (`WindowExtensions.vue`, `WindowRanking.vue`, ...) and wrap the shared [`FloatingWindow.vue`](/src/modules/common/window/FloatingWindow.vue) / [`BaseEvaluationWindow.vue`](/src/modules/common/evaluation/BaseEvaluationWindow.vue).
- Plain `.ts`/`.vue` support files use `camelCase` (`moduleConfig.ts`, `useSettings.ts`).

## Composables & shared state

- There is no global store library (no Vuex/Pinia). Shared reactive state is a plain `useXxx()` composable returning an object of refs/functions.
- State that must be a _singleton_ across every component instance (settings, theme, notifications registry) wraps the composable in `createSharedComposable` from `@vueuse/shared`:

  ```ts
  export const useSettings = createSharedComposable(() => {
    const graphStyle = useStorage<GraphStyleName>('settings:graphStyle', 'default')
    // ...
    return { graphStyle, ... }
  })
  ```

- Persisted state uses `useStorage` from `@vueuse/core` with a `namespace:key` localStorage key (`settings:graphStyle`, `settings:snapMode`), so it's self-documenting which composable owns which key.
- Cross-cutting values that only descendants of a specific subtree need (the active module's glossary, tooltip registry) are passed via `provide`/`inject` with a typed key, not a shared composable: declare `export const FOO_KEY: InjectionKey<FooType> = Symbol('foo')` next to the type it carries, `provide(FOO_KEY, value)` near the top of the providing component's `<script setup>`, and `inject(FOO_KEY)` in consumers. See [`TOOLTIP_REGISTRY_KEY`](/src/modules/common/tooltip/tooltipRegistry.ts).

## Data fetching

Server calls (TweetyProject evaluation, graph generation) go through [`@tanstack/vue-query`](https://tanstack.com/query), wrapped in a dedicated `useXxxQuery` composable per concern (e.g. `useExtensionEvaluationQuery` in [`tweetyProject.ts`](/src/modules/abstract-argumentation/evaluation/tweetyProject.ts)) rather than calling `fetch` directly from components.

## Document state & undo/redo

Document models are plain classes marked `[immerable] = true` (from [`immer`](https://immerjs.github.io/immer/)). Edits go through `produce`, never manual mutation or deep-cloning. [`modifyDocument`](/src/modules/common/state.ts) wraps this to additionally record immer patches for undo/redo history (capped at `MAX_HISTORY_DEPTH`).

## Error handling & validation

- User-facing operations that can fail in expected ways (loading/importing a file) return a discriminated-union result instead of throwing: `{ success: true, data } | { success: false, errors }`, with the unused branch's fields typed `never` so callers are forced to check `success` first — see [`DeserializationResult`](/src/modules/common/save/load.ts).
- Import/validation errors are modeled as a small class hierarchy extending an abstract `ImportError` base with a `message` getter (`JsonSyntaxError`, `SchemaMismatchError`, `ValidationError`, ...), so different failure kinds can be distinguished with `instanceof` while all carry a user-displayable message.
- Transient, non-recoverable UI feedback (a save succeeded/failed) uses the [`useNotifications()`](/src/modules/common/notifications/useNotifications.ts) composable's `addSuccessNotification`/`addErrorNotification`, which auto-dismiss after a timeout — not ad-hoc toasts per component.

## Localization

- All user-facing text is localized (English + German) via `vue-i18n`. Add keys to
  `src/localization/locales/en/messages/` and their German counterpart, then read them with an
  explicit `const { t } = useI18n({ useScope: 'global' })` — not implicit `$t`. English is the
  schema; a missing German key fails `type-check`. See [localization.md](./localization.md) for
  adding keys, structured content, and new locales.
- Keep stable IDs (`ModuleConfig.id`, `TagId`, `ExportFormatId`, layout/relation keys) in domain
  objects and derive localized labels in computed view models, never `t()` in module-level
  singletons. Machine output (JSON/ICCMA/TGF/LaTeX exports, file names) stays locale-neutral.

## IDs

- Graph node/edge/argument IDs are small sequential numbers, minted by [`IdGenerator`](/src/modules/common/ids.ts) and mapped across import/export boundaries with `IdMapping`.
- Ephemeral, non-persisted keys (notification keys, document state IDs) use `generateUUID()` (a thin wrapper around `crypto.randomUUID()`), typed as the branded `UUID` template-literal type rather than plain `string`.

## Styling & theming

- **The palette is the exclusive source of application colors.** Every color must resolve from [`palette.ts`](/src/modules/common/theme/palette.ts), which defines each token once for light and dark mode and is injected as `--color-*` custom properties before mount. No raw color literals (hex/`rgb`/`hsl`/named) and no Tailwind _primitive_ color utilities (`bg-white`, `text-black`, `bg-red-500`, `text-gray-700`, …) in app code — use DaisyUI semantic classes and tokens (`bg-base-100`, `text-primary`, `btn-secondary`, `alert-error`), the app tokens (`var(--color-focus)`, `var(--color-scrim)`, `var(--color-shadow)`, `.bg-scrim`, `.shadow-footer`), or opacity/`color-mix` on those. Need a new color? Add a token to `palette.ts` — never inline one.
  - Exceptions: **graph colors** (node/link/highlight; still being migrated and not yet tokenized), **format-owned document colors** (e.g. user-authored LaTeX/TikZ output), and the standalone [`public/maintenance.html`](/public/maintenance.html), which mirrors the palette values by hand because it loads without the app bundle. Keep those in sync with the palette.
- [Tailwind CSS v4](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/) utility classes are used directly in templates; there are effectively no component `<style>` blocks (only a handful of `.vue` files have one — prefer utility classes over scoped CSS).
- Global/custom CSS lives in [`src/style.css`](/src/style.css) and is reserved for things utility classes can't express well: the SVG graph canvas (nodes, links, labels) and scrollbar styling.
- Colors in that custom CSS reference the theme CSS variables (`var(--color-base-100)`, `var(--color-base-content)`, `var(--color-focus)`) rather than hardcoded hex values, so they follow the active theme automatically. Graph-specific colors that aren't part of the palette are (for now) exposed as their own CSS custom properties with a fallback (`var(--graph-node-stroke-color, #5a87a8)`).
- Light/dark theme is a single `data-theme` attribute on `<html>`, toggled by [`useTheme()`](/src/modules/common/theme/useTheme.ts) (itself a `createSharedComposable`/`useStorage` pair, following the shared-state convention above).
- SVG graph elements use BEM-style class names (`graph-controller__node`, `graph-controller__link-label`) since they're targeted by the graph rendering code rather than styled ad hoc.

## Testing

- Unit tests ([Vitest](https://vitest.dev/)) are colocated next to the code they test as `*.test.ts` (e.g. [`saveFormat.test.ts`](/src/modules/abstract-argumentation/save/saveFormat.test.ts) beside `saveFormat.ts`), not in a parallel `__tests__` tree.
- Use `expect.soft(...)` instead of `expect(...)` when a test makes several assertions that should all be reported even if one fails (common when checking multiple properties of one error/result object).
- E2E tests ([Playwright](https://playwright.dev/)) live under [`e2e/`](/e2e/) as `*.spec.ts` and use role/accessibility-based locators (`getByRole`, `getByPlaceholder`) rather than CSS selectors, so tests track user-visible behavior rather than markup.

## Module shape

Every argumentation type under `src/modules/<type>/` follows the same internal file layout (`moduleConfig.ts`, `model.ts`, `GraphEditor.vue`, `glossary.ts`, `tutorials/`, `evaluation/`, `examples.ts`, `export.ts`, `save/`, `Window*.vue`) so that switching between modules or adding a new one is mostly pattern-matching against an existing one. See [structure.md](./structure.md#src-modules--one-folder-per-argumentation-type) for the full breakdown and [extending.md](./extending.md) for the extension points this shape enables.
