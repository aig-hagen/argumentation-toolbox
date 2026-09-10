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
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import { i18n } from '@/localization'
import EvaluationResultGrid from '@/modules/common/evaluation/EvaluationResultGrid.vue'

class FakeResizeObserver implements ResizeObserver {
  static instances: FakeResizeObserver[] = []

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  observe(_target: Element, _options?: ResizeObserverOptions) {}
  unobserve(_target: Element) {}
  disconnect() {}

  fire(width: number) {
    this.callback([{ contentRect: { width } } as ResizeObserverEntry], this)
  }
}

const rect = (width: number) =>
  ({
    width,
    height: 32,
    top: 0,
    right: width,
    bottom: 32,
    left: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }) as DOMRect

beforeEach(() => {
  FakeResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('remeasures results that were first rendered inside a hidden evaluation', async () => {
  const visible = ref(false)

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (!visible.value) return rect(0)
    if (this.classList.contains('evaluation-result-grid')) return rect(320)
    if (!this.parentElement?.classList.contains('evaluation-result-grid--measuring')) {
      return rect(192)
    }
    return rect(this.textContent?.includes('{a, b, d}') ? 104 : 64)
  })

  const wrapper = mount(
    defineComponent(
      () => () =>
        h('div', { style: { display: visible.value ? undefined : 'none' } }, [
          h(EvaluationResultGrid, {
            items: [
              { key: 'a', label: '{a}', texLabel: '\\{a\\}' },
              { key: 'abd', label: '{a, b, d}', texLabel: '\\{a,b,d\\}' },
            ],
          }),
        ]),
    ),
    { global: { plugins: [i18n] } },
  )
  await flushPromises()

  const grid = wrapper.get<HTMLElement>('.evaluation-result-grid').element
  expect(grid.style.getPropertyValue('--evaluation-item-min-width')).toBe('')

  visible.value = true
  await nextTick()
  FakeResizeObserver.instances[0]!.fire(320)
  await flushPromises()

  expect(grid.style.getPropertyValue('--evaluation-item-min-width')).toBe('104px')
})
