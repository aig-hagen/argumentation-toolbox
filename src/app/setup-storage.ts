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
 * Test-environment storage shim.
 *
 * On current Node + jsdom (Node ships an experimental `localStorage` global gated
 * behind `--localstorage-file`, and jsdom exposes no Storage of its own here), the
 * `localStorage`/`sessionStorage` globals are undefined during unit tests. The app
 * relies on them through VueUse `useStorage`, so provide a minimal in-memory Web
 * Storage implementation when a working one is absent. This file is a Vitest
 * `setupFiles` entry only; production runs in real browsers with native storage.
 */

class InMemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

function isUsableStorage(value: unknown): value is Storage {
  try {
    return typeof (value as Storage | undefined)?.getItem === 'function'
  } catch {
    return false
  }
}

function installStorage(name: 'localStorage' | 'sessionStorage'): void {
  // Probe `window` rather than `globalThis` so we don't trip Node's native
  // experimental `localStorage` getter (which logs a warning on access).
  const existing = typeof window !== 'undefined' ? window[name] : undefined
  if (isUsableStorage(existing)) return

  const storage = new InMemoryStorage()
  const descriptor: PropertyDescriptor = { value: storage, configurable: true, writable: true }
  Object.defineProperty(globalThis, name, descriptor)
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, name, descriptor)
  }
}

installStorage('localStorage')
installStorage('sessionStorage')
