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
import { i18n } from '@/localization'
import { useNotifications } from '@/modules/common/notifications/useNotifications'

let hasNotified = false

/**
 * Surfaces at most one toast per page load when persistence (localStorage or
 * IndexedDB) fails - e.g. private browsing, disabled storage, or quota errors -
 * so failures across many keys/components don't spam the user with duplicate toasts.
 */
export function notifyStorageFailureOnce(error?: unknown) {
  if (error !== undefined) {
    console.error('Storage operation failed.', error)
  }
  if (hasNotified) return
  hasNotified = true
  const { addErrorNotification } = useNotifications()
  const t = i18n.global.t
  addErrorNotification(t('errors.storage.title'), t('errors.storage.description'), 10_000)
}
