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
import { createI18n } from 'vue-i18n'

import de from '@/localization/locales/de'
import en from '@/localization/locales/en'
import { fetchShare, ShareError, uploadShare } from '@/modules/common/share/useShare'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, de } })
const t = i18n.global.t

function mockResponse(init: { ok: boolean; status: number; body?: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: init.ok,
      status: init.status,
      json: async () => init.body ?? {},
    })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('a rate-limited upload maps to a stable code, not a raw message', async () => {
  mockResponse({ ok: false, status: 429 })
  const error = await uploadShare('{}').catch((e: unknown) => e)
  expect(error).toBeInstanceOf(ShareError)
  expect((error as ShareError).code).toBe('rateLimited')
})

test('an unknown upload failure keeps the raw server detail out of the localized heading', async () => {
  // A hostile/unknown server detail must not become the shown heading.
  const malicious = '<img src=x onerror=alert(1)>'
  mockResponse({ ok: false, status: 500, body: { error: malicious } })

  const error = (await uploadShare('{}').catch((e: unknown) => e)) as ShareError
  expect(error).toBeInstanceOf(ShareError)
  expect(error.code).toBe('uploadFailed')
  expect(error.params.status).toBe(500)
  // Raw server text is preserved only as optional technical detail...
  expect(error.detail).toBe(malicious)
  // ...while the presented heading is a clean localized string with no server markup.
  const heading = t(`share.load.errors.${error.code}`, error.params)
  expect(heading).not.toContain(malicious)
  expect(heading).toContain('500')
})

test('a missing share maps to the notFound code in both locales', async () => {
  mockResponse({ ok: false, status: 404 })
  const error = (await fetchShare('missing').catch((e: unknown) => e)) as ShareError
  expect(error.code).toBe('notFound')

  for (const locale of ['en', 'de'] as const) {
    i18n.global.locale.value = locale
    expect(t(`share.load.errors.${error.code}`, error.params).length).toBeGreaterThan(0)
  }
})
