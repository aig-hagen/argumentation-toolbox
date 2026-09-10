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
/**
 * Locale-neutral descriptor for compact relative time. The caller maps `unit`
 * to a localized message (`common.time.*`); `absolute` falls back to a
 * locale-formatted date for anything older than a few weeks.
 */
export type RelativeTime =
  | { unit: 'justNow' }
  | { unit: 'minutesAgo' | 'hoursAgo' | 'daysAgo' | 'weeksAgo'; count: number }
  | { unit: 'absolute'; timestamp: number }

export function relativeTime(timestamp: number, now: number = Date.now()): RelativeTime {
  const seconds = Math.round((now - timestamp) / 1000)
  if (seconds < 45) return { unit: 'justNow' }
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return { unit: 'minutesAgo', count: minutes }
  const hours = Math.round(minutes / 60)
  if (hours < 24) return { unit: 'hoursAgo', count: hours }
  const days = Math.round(hours / 24)
  if (days < 7) return { unit: 'daysAgo', count: days }
  const weeks = Math.round(days / 7)
  if (weeks < 5) return { unit: 'weeksAgo', count: weeks }
  return { unit: 'absolute', timestamp }
}

export function getOrSet<KeyT, ValueT>(
  map: Map<KeyT, ValueT>,
  key: KeyT,
  defaultValueFacotry: () => ValueT,
): ValueT {
  if (map.has(key)) return map.get(key)!
  const defaultValue = defaultValueFacotry()
  map.set(key, defaultValue)
  return defaultValue
}
