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
import { trackEvent } from '@/app/usage/report'
import { ANALYTICS_EVENTS } from '@/app/usage/signals'

/** Stable code for a localized share-service failure under `share.load.errors.*`. */
export type ShareErrorCode = 'rateLimited' | 'uploadFailed' | 'notFound' | 'loadFailed'

/** A structured share-service failure carrying a stable code, localized at the boundary. */
export class ShareError extends Error {
  constructor(
    readonly code: ShareErrorCode,
    readonly params: { status?: number } = {},
    readonly detail?: string,
  ) {
    super(code)
    this.name = 'ShareError'
  }
}

export async function uploadShare(content: string): Promise<{ id: string; url: string }> {
  const response = await fetch('/shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) {
    if (response.status === 429) throw new ShareError('rateLimited')
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    throw new ShareError('uploadFailed', { status: response.status }, body.error)
  }
  const { id } = (await response.json()) as { id: string }
  trackEvent(ANALYTICS_EVENTS.shareCreate)
  return { id, url: `${window.location.origin}/share/${id}` }
}

export async function fetchShare(id: string): Promise<string> {
  const response = await fetch(`/shares/${encodeURIComponent(id)}`)
  if (!response.ok) {
    if (response.status === 404) throw new ShareError('notFound')
    throw new ShareError('loadFailed', { status: response.status })
  }
  const body = (await response.json()) as { content: string }
  return body.content
}
