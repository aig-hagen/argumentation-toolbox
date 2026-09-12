/*
 * AgonProject - The platform to explore different approaches to formal argumentation.
 *
 * Copyright (C) 2026  Artificial Intelligence Group at the Faculty of Mathematics and Computer Science of the FernUniversität in Hagen <https://www.fernuni-hagen.de/aig/en/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import { afterEach, expect, test, vi } from 'vitest'

import {
  applyLocale,
  ensureLocaleLoaded,
  i18n,
  isSupportedLocale,
  normalizeLocale,
  resolveInitialLocale,
} from '@/localization/locale'

function stubBrowserLanguages(languages: string[]): void {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('normalizeLocale maps regional tags to a supported language', () => {
  expect(normalizeLocale('de-DE')).toBe('de')
  expect(normalizeLocale('de-AT')).toBe('de')
  expect(normalizeLocale('en-US')).toBe('en')
  expect(normalizeLocale('EN')).toBe('en')
})

test('normalizeLocale rejects unsupported or empty values', () => {
  expect(normalizeLocale('fr')).toBeUndefined()
  expect(normalizeLocale('')).toBeUndefined()
  expect(normalizeLocale(null)).toBeUndefined()
  expect(normalizeLocale(undefined)).toBeUndefined()
})

test('isSupportedLocale recognizes only known locales', () => {
  expect(isSupportedLocale('en')).toBe(true)
  expect(isSupportedLocale('de')).toBe(true)
  expect(isSupportedLocale('fr')).toBe(false)
  expect(isSupportedLocale(42)).toBe(false)
})

test('resolveInitialLocale prefers a valid persisted preference', () => {
  stubBrowserLanguages(['en-US'])
  expect(resolveInitialLocale('de')).toBe('de')
})

test('resolveInitialLocale defaults to English regardless of browser language', () => {
  stubBrowserLanguages(['fr-FR', 'de-DE', 'en'])
  expect(resolveInitialLocale('')).toBe('en')
  expect(resolveInitialLocale(null)).toBe('en')
})

test('resolveInitialLocale ignores an invalid persisted value', () => {
  stubBrowserLanguages(['de'])
  expect(resolveInitialLocale('fr')).toBe('en')
})

test('applyLocale loads the bundle, switches Vue I18n, and syncs html lang', async () => {
  await applyLocale('de')
  expect(i18n.global.locale.value).toBe('de')
  expect(document.documentElement.lang).toBe('de')
  expect(i18n.global.t('settings.title')).toBe('Einstellungen')

  await applyLocale('en')
  expect(i18n.global.locale.value).toBe('en')
  expect(document.documentElement.lang).toBe('en')
})

test('ensureLocaleLoaded is idempotent for repeated and concurrent calls', async () => {
  await expect(Promise.all([ensureLocaleLoaded('de'), ensureLocaleLoaded('de')])).resolves.toEqual([
    undefined,
    undefined,
  ])
})
