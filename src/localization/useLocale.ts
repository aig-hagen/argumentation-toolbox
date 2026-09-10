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
import { useStorage } from '@vueuse/core'
import { createSharedComposable } from '@vueuse/shared'
import { computed } from 'vue'

import type { SupportedLocale } from '@/localization/locale'
import {
  applyLocale,
  DEFAULT_LOCALE,
  isSupportedLocale,
  resolveInitialLocale,
  SUPPORTED_LOCALES,
} from '@/localization/locale'
import { notifyStorageFailureOnce } from '@/modules/common/notifications/storageFailure'

export const LOCALE_STORAGE_KEY = 'settings:locale'

export const useLocale = createSharedComposable(() => {
  const stored = useStorage<string>(LOCALE_STORAGE_KEY, '', undefined, {
    onError: notifyStorageFailureOnce,
  })

  const locale = computed<SupportedLocale>(() =>
    isSupportedLocale(stored.value) ? stored.value : DEFAULT_LOCALE,
  )

  /** Resolve and apply the startup locale; call before mounting the app. */
  async function initLocale(): Promise<void> {
    const initial = resolveInitialLocale(stored.value)
    await applyLocale(initial)
    // Persist a normalized value so future visits skip browser detection.
    stored.value = initial
  }

  /**
   * Switch languages at runtime. Persist only after the bundle loads so a failed
   * load leaves the previous locale fully active rather than partially switched.
   */
  async function setLocale(next: SupportedLocale): Promise<void> {
    if (next === locale.value) return
    await applyLocale(next)
    stored.value = next
  }

  return { locale, setLocale, initLocale, supportedLocales: SUPPORTED_LOCALES }
})
