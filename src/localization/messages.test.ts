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
import { expect, test } from 'vitest'
import { createI18n } from 'vue-i18n'

import de from '@/localization/locales/de'
import en from '@/localization/locales/en'

type Tree = { [key: string]: string | Tree }

function keyPaths(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string' ? [path] : keyPaths(value, path)
  })
}

function leafAt(tree: Tree, path: string): string {
  return path.split('.').reduce<unknown>((node, key) => {
    return (node as Record<string, unknown>)[key]
  }, tree) as string
}

/** Named interpolation tokens (`{fileName}`, `{count}`, …) in a message string. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort()
}

test('German catalog has the same message keys as English', () => {
  const enKeys = keyPaths(en as Tree).sort()
  const deKeys = keyPaths(de as Tree).sort()
  expect(deKeys).toEqual(enKeys)
})

test('every leaf value is a non-empty string in both locales', () => {
  for (const tree of [en, de]) {
    const blanks = keyPaths(tree as Tree).filter((path) => {
      const value = path
        .split('.')
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], tree)
      return typeof value !== 'string' || value.length === 0
    })
    expect(blanks).toEqual([])
  }
})

test('German and English use the same interpolation placeholders per key', () => {
  const mismatches = keyPaths(en as Tree)
    .map((path) => ({
      path,
      en: placeholders(leafAt(en as Tree, path)),
      de: placeholders(leafAt(de as Tree, path)),
    }))
    .filter(({ en, de }) => en.join(',') !== de.join(','))
  expect(mismatches).toEqual([])
})

test('user data interpolated into error messages is inserted verbatim as text', () => {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, de } })
  const t = i18n.global.t

  // A filename containing markup must survive interpolation untouched (rendered as text,
  // never markup) — no escaping artefacts, no execution, no dropped characters.
  const fileName = '<img src=x onerror=alert(1)>.json'
  const detail = 'unexpected token "<"'

  for (const locale of ['en', 'de'] as const) {
    i18n.global.locale.value = locale
    const message = t('errors.import.validation', { fileName, detail })
    expect(message).toContain(fileName)
    expect(message).toContain(detail)
  }
})
