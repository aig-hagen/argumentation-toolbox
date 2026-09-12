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
import { createI18n } from 'vue-i18n'

import enMessages from '@/localization/locales/en'
import type { LocaleMessageSchema } from '@/localization/types'

export const SUPPORTED_LOCALES = ['en', 'de'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE = 'en' satisfies SupportedLocale

/** Autonyms so the selector stays readable regardless of the active language. */
export const LOCALE_AUTONYMS: Record<SupportedLocale, string> = {
  en: 'English',
  de: 'Deutsch',
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Normalize a BCP-47 tag such as `de-DE` or `en-US` to a supported language ID. */
export function normalizeLocale(value: string | null | undefined): SupportedLocale | undefined {
  if (!value) return undefined
  const base = value.toLowerCase().split('-')[0]
  return isSupportedLocale(base) ? base : undefined
}

/**
 * Initial selection order: a valid persisted preference, then English. German is
 * opt-in via settings only, so the browser language is deliberately ignored.
 */
export function resolveInitialLocale(persisted: string | null | undefined): SupportedLocale {
  const fromStorage = normalizeLocale(persisted)
  if (fromStorage) return fromStorage
  return DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  // Only English is populated eagerly; the cast tells the Composer both locale IDs
  // are valid so `locale.value` accepts `de` after its bundle is lazy-loaded.
  messages: { en: enMessages } as Record<SupportedLocale, LocaleMessageSchema>,
})

/** Explicit, Vite-analyzable lazy loaders for non-eager locales. */
const localeLoaders: Record<
  Exclude<SupportedLocale, typeof DEFAULT_LOCALE>,
  () => Promise<{ default: LocaleMessageSchema }>
> = {
  de: () => import('@/localization/locales/de'),
}

const loadedLocales = new Set<SupportedLocale>([DEFAULT_LOCALE])

export async function ensureLocaleLoaded(locale: SupportedLocale): Promise<void> {
  if (loadedLocales.has(locale)) return
  const loader = localeLoaders[locale as Exclude<SupportedLocale, typeof DEFAULT_LOCALE>]
  if (!loader) return
  const { default: messages } = await loader()
  i18n.global.setLocaleMessage(locale, messages)
  loadedLocales.add(locale)
}

/**
 * Apply a locale to the running app: load its bundle, switch Vue I18n, and sync
 * `<html lang>`. Throws if the bundle fails to load so callers can keep the previous
 * locale active.
 */
export async function applyLocale(locale: SupportedLocale): Promise<void> {
  await ensureLocaleLoaded(locale)
  i18n.global.locale.value = locale
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}
