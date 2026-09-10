<!--
  AgonProject - The platform to explore different approaches to formal argumentation.

  Copyright (C) 2026  Artificial Intelligence Group at the Faculty of Mathematics and Computer Science of the FernUniversität in Hagen <https://www.fernuni-hagen.de/aig/en/>

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import EvaluationStatusFooter from '@/modules/common/evaluation/EvaluationStatusFooter.vue'

const { t } = useI18n({ useScope: 'global' })

const selected = defineModel<string | undefined>('selected')
const props = defineProps<{
  items: { key: string; label: string; texLabel: string }[]
  emptyMessage?: string
  selectionHint?: string
  evaluationDurationInMs?: number
  /** Localized plural noun for the copy notification, e.g. "extensions". */
  resultNoun?: string
}>()

const resolvedEmptyMessage = computed(() => props.emptyMessage ?? t('evaluation.status.noResults'))

const statusLine = computed(() => {
  const parts: string[] = []
  if (props.evaluationDurationInMs !== undefined) parts.push(props.evaluationDurationInMs + 'ms')
  if (props.selectionHint) parts.push(props.selectionHint)
  return parts.join(' · ')
})

const copyText = computed(() =>
  props.items.length > 0 ? props.items.map((item) => item.label).join(', ') : undefined,
)
const copyTextTex = computed(() =>
  props.items.length > 0 ? props.items.map((item) => item.texLabel).join(', ') : undefined,
)

const containerRef = useTemplateRef('container')
const itemRefs = useTemplateRef('item-refs')

const MIN_WIDTH_VAR = '--evaluation-item-min-width'
const MEASURING_CLASS = 'evaluation-result-grid--measuring'

let measurementVersion = 0

async function measureItemWidths() {
  const version = ++measurementVersion
  const container = containerRef.value
  if (container === null) return
  if (props.items.length === 0) return

  // Compact evaluation instances stay mounted under v-show. An inactive instance
  // has no layout box, so measuring it would cache 0px and collapse every grid
  // column when that instance is selected later.
  if (container.getBoundingClientRect().width <= 0) return

  // Use a single max-content track while measuring. A fixed fallback track here
  // would make the buttons report that track's width and lock the mobile grid to
  // one column instead of their intrinsic content width.
  container.classList.add(MEASURING_CLASS)
  await nextTick()
  if (version !== measurementVersion) return
  if (containerRef.value !== container) {
    container.classList.remove(MEASURING_CLASS)
    return
  }
  const elements = itemRefs.value as HTMLElement[] | null
  if (elements === null || elements.length === 0) {
    container.classList.remove(MEASURING_CLASS)
    return
  }
  const maxWidth = Math.max(...elements.map((el) => el.getBoundingClientRect().width))
  container.classList.remove(MEASURING_CLASS)
  if (maxWidth <= 0) return
  container.style.setProperty(MIN_WIDTH_VAR, `${maxWidth}px`)
}

watch(
  [containerRef, () => props.items.map((item) => item.label).join('\0')],
  () => void measureItemWidths(),
  { immediate: true, flush: 'post' },
)

// Visibility itself is not reactive: v-show only changes an ancestor's display.
// Watching the container width catches hidden -> visible switches as well as sheet
// and viewport resizes, then recomputes the intrinsic item width in real layout.
let resizeObserver: ResizeObserver | undefined
let lastObservedWidth = 0

watch(
  containerRef,
  (container) => {
    resizeObserver?.disconnect()
    resizeObserver = undefined
    lastObservedWidth = 0
    if (container === null || typeof ResizeObserver === 'undefined') return

    resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0
      if (width <= 0) {
        lastObservedWidth = 0
        return
      }
      if (Math.abs(width - lastObservedWidth) < 0.5) return
      lastObservedWidth = width
      void measureItemWidths()
    })
    resizeObserver.observe(container)
  },
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    v-if="props.items.length === 0"
    data-evaluation-results
    role="alert"
    class="alert alert-info alert-soft"
  >
    <span>{{ resolvedEmptyMessage }}</span>
  </div>
  <div v-else data-evaluation-results class="evaluation-result-grid gap-2" ref="container">
    <button
      v-for="item of props.items"
      :key="item.key"
      type="button"
      class="btn btn-sm gap-2 justify-start outline-none focus:outline-none text-base"
      :class="{
        'btn-soft': selected === item.key,
        'btn-ghost': selected !== item.key,
      }"
      @click="selected = selected === item.key ? undefined : item.key"
      ref="item-refs"
    >
      {{ item.label }}
    </button>
  </div>
  <EvaluationStatusFooter
    :status-line="statusLine || undefined"
    :copy-text="copyText"
    :copy-text-tex="copyTextTex"
    :result-noun="props.resultNoun"
  />
</template>

<style scoped>
.evaluation-result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--evaluation-item-min-width), auto));
  justify-content: start;
}

.evaluation-result-grid--measuring {
  grid-template-columns: max-content;
}
</style>
