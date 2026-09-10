# Localization

AgonProject ships English and German. Localization is built on
[`vue-i18n`](https://vue-i18n.intlify.dev/) v11 in Composition API mode. This guide covers the
routine contributor tasks plus what is still untranslated.

## Layout

```text
src/localization/
├── index.ts        # installI18n() + re-exports
├── locale.ts       # SUPPORTED_LOCALES, normalization, lazy loaders, applyLocale()
├── useLocale.ts     # useLocale(): { locale, setLocale, initLocale }, persists settings:locale
├── types.ts        # LocaleMessageSchema — the recursive shape every locale must satisfy
└── locales/
    ├── en/          # schema + fallback source (loaded eagerly)
    │   ├── index.ts        # merges every messages/*.ts namespace into one bundle
    │   └── messages/*.ts   # one file per namespace (common, editor, home, ...)
    └── de/          # identical structure; lazy-loaded, typed `: LocaleMessageSchema`
```

English is the schema. `LocaleMessageSchema` is a recursive mapped type over the English tree, so
`de/index.ts` fails to compile if a key is missing or misnamed. `messages.test.ts` additionally
checks placeholder parity (both locales use the same `{named}` interpolations per key).

## Adding or changing a message key

1. **English first.** Add the key to the right namespace under
   `src/localization/locales/en/messages/`. Group by user-facing feature, not by component
   filename. Name keys by meaning, never by the English wording (`editor.toolbar.fitToView`, not
   `editor.toolbar.fitToViewButton`). Don't reuse a generic key across genuinely different
   meanings.
2. **German next.** Add the same key path to the matching `de/messages/` file. TypeScript won't
   compile until the German tree matches English exactly.
3. **Use it in a component** via an explicit translator, not implicit `$t`:

   ```ts
   import { useI18n } from 'vue-i18n'
   const { t } = useI18n({ useScope: 'global' })
   // template: {{ t('editor.toolbar.fitToView') }}
   ```

Rules of thumb:

- Interpolate values with named params: `t('home.documents.edited', { time })` for
  `'Edited {time}'`. Never concatenate translated fragments — German word order differs, so
  translate the whole sentence.
- For counts, use vue-i18n pluralization rather than assembling singular/plural in code.
- For markup inside a sentence, use the `<i18n-t>` component instead of adding a `v-html` site.
- Keep format names and acronyms (AF, ADF, ICCMA, TGF, LaTeX, SVG) unchanged unless terminology
  review says otherwise.
- Locale-format human-readable numbers/dates with `Intl` (see `common.time.*` +
  `toLocaleDateString(locale.value)` in `HomeViewMobile`). Keep machine output (JSON, ICCMA, TGF,
  LaTeX, file names, probability values that pair with numeric inputs) canonical — no German
  decimal commas in exported or editable data.

## Updating structured content (glossaries, tutorials)

Glossary and tutorial copy is **not** ordinary vue-i18n messages — it carries LaTeX, pipes, and
trusted HTML that the message compiler would choke on. It lives as typed data in
`locales/<locale>/glossaries/` and `locales/<locale>/tutorials/`, selected by the same locale
service. Keep term IDs, cross-reference targets, tutorial/step IDs, anchors, and `advanceOn`
behavior **stable across languages**; translate only labels, titles, and bodies. (These bundles
are not yet populated — see [Not yet translated](#not-yet-translated).)

## Adding a new locale

1. Add the ID to `SUPPORTED_LOCALES` in `locale.ts` and an autonym to `LOCALE_AUTONYMS`.
2. Register a lazy loader in `localeLoaders` (English stays eager as the fallback):

   ```ts
   const localeLoaders = {
     de: () => import('@/localization/locales/de'),
     fr: () => import('@/localization/locales/fr'),
   }
   ```

3. Copy `locales/en/` to `locales/<id>/`, keep the file/key structure identical, translate the
   leaf strings, and type the new `index.ts` as `: LocaleMessageSchema`.
4. Normalization (`de-DE` → `de`) and the Settings selector pick the locale up automatically from
   `SUPPORTED_LOCALES`.

## Not yet translated

All interactive chrome, notifications, and expected errors are localized. The following is
**deferred** — mostly scientific/domain content that needs German domain-expert review, grouped
for a later pass:

- **Semantics labels** — semantics and semantics-family display names (e.g. the extension/ranking
  selectors) and meta-reasoner parameter labels/descriptions stay English. The `displayName` also
  feeds notation (`formatNotation`, `.toLowerCase()`), so localizing it needs a notation-vs-label
  split first.
- **Generator metadata** — framework-type, algorithm, and parameter names/descriptions in the
  Generate view (`formatAlgorithmName`/`formatParamLabel` plus the backend `graph-gen` English
  `description`s).
- **Tutorial content** — all common and per-module tutorial copy (`locales/<locale>/tutorials/`).
  The chrome around tutorials (window title, Start/Next/Skip/Done, etc.) is already localized.
- **Glossary content** — all term labels, titles, and definitions for every module
  (`locales/<locale>/glossaries/`). The glossary page chrome (search, empty states, navigation) is
  already localized.

The following is **intentionally never translated** — technical, canonical, or third-party:

- The brand name **AgonProject**.
- Example names/descriptions and the document names derived from them (canonical).
- Export **format names** (ICCMA, TGF, LaTeX) and LaTeX export **style values**
  (`standard`/`bold`/…); file extensions and exported syntax.
- Keyboard key names (`Ctrl`, `Shift`) and recognized acronyms (AF, ADF, TGF, SVG, …).
- Third-party library names, licenses, and attribution text on the third-party page.

## Checks

`npm run type-check` enforces key parity; `npm run test:unit` runs `messages.test.ts` (placeholder
parity, interpolation safety) and `locale.test.ts` (normalization, selection precedence,
persistence, fallback, load success/failure, `lang` sync). Run the full batch before a PR:

```sh
npm run format && npm run format:check && npm run lint && npm run type-check && npm run test:unit -- --run && npm run build
```
