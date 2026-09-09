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
import { mount } from '@vue/test-utils'
import { afterEach, expect, test } from 'vitest'
import { defineComponent, h } from 'vue'

import type { ModuleConfig } from '@/app/home/moduleConfig'
import { useModuleCards } from '@/app/home/useModuleCards'
import { applyLocale, DEFAULT_LOCALE, i18n } from '@/localization'
import { TAG_ABSTRACT, TAG_ATTACK } from '@/modules/common/tags'

// A minimal stand-in config; only the fields the mapper reads matter here.
const fakeModule = {
  id: 'abstract',
  newNamePrefix: 'AF',
  examples: [],
  initialCotent: {},
  tags: [TAG_ABSTRACT, TAG_ATTACK],
} as unknown as ModuleConfig<object>

afterEach(async () => {
  await applyLocale(DEFAULT_LOCALE)
})

test('module cards recompute their labels when the locale changes', async () => {
  const cards = mount(
    defineComponent({
      setup() {
        const cards = useModuleCards([fakeModule])
        return () => h('div', JSON.stringify(cards.value[0]))
      },
    }),
    { global: { plugins: [i18n] } },
  )

  expect(cards.text()).toContain('Abstract Argumentation')
  expect(cards.text()).toContain('Attack')

  await applyLocale('de')
  await cards.vm.$nextTick()

  expect(cards.text()).toContain('Abstrakte Argumentation')
  expect(cards.text()).toContain('Angriff')
})
