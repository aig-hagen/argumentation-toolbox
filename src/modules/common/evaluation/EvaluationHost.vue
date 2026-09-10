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
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { XMarkIcon } from '@heroicons/vue/24/solid'
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  useTemplateRef,
  watch,
  watchEffect,
} from 'vue'
import { useI18n } from 'vue-i18n'

import {
  EVALUATION_DETENT_KEY,
  type EvaluationDetentLayout,
} from '@/modules/common/evaluation/hostContext'
import KindIcon from '@/modules/common/evaluation/KindIcon.vue'
import type { EvaluationKind } from '@/modules/common/evaluation/types'
import {
  SHEET_REFIT_KEY,
  TUTORIAL_COLLAPSE_KEY,
  TUTORIAL_REF_REGISTRY_KEY,
} from '@/modules/common/graph-editor/graphEditor'
import BottomSheet from '@/modules/common/window/BottomSheet.vue'

export interface EvaluationChip {
  id: string
  label: string
  kind: EvaluationKind
}

// Compact-only host: one sheet over all saved evaluation configs. Owns navigation
// (the chip row), add/remove, and which config is active; each kind's parameter and
// result body is rendered by the module through the default slot.
const { chips, addKinds = ['extension'] } = defineProps<{
  chips: EvaluationChip[]
  /** Kinds the module lets you add; more than one shows a picker on the add button. */
  addKinds?: EvaluationKind[]
}>()

const open = defineModel<boolean>('open', { required: true })
const activeId = defineModel<string | undefined>('activeId', { default: undefined })

const emit = defineEmits<{ add: [kind: EvaluationKind]; remove: [id: string] }>()

const reportCollapse = inject(TUTORIAL_COLLAPSE_KEY, null)

const { t } = useI18n({ useScope: 'global' })

const kindLabel = computed<Record<EvaluationKind, string>>(() => ({
  extension: t('evaluation.kinds.extension'),
  ranking: t('evaluation.kinds.ranking'),
  serialisation: t('evaluation.kinds.serialisation'),
}))

// Snap detents as fractions of the viewport height (compact / standard / full).
const SNAP_POINTS = [0.28, 0.48, 0.9]

// Detent index (0/1/2) from the sheet → layout the mobile body reads to fold the
// selector row / glossary away at the compact detent.
const detentIndex = ref(0)
const detentLayout = computed<EvaluationDetentLayout>(() =>
  detentIndex.value <= 0 ? 'compact' : detentIndex.value === 1 ? 'standard' : 'full',
)
provide(EVALUATION_DETENT_KEY, detentLayout)

// Folding back to the compact detent hides the parameters — the mobile equivalent of
// collapsing the parameter panel (used by the evaluation tutorial).
watch(detentLayout, (layout, previous) => {
  if (layout === 'compact' && previous !== 'compact') reportCollapse?.()
})

// Register the collapse control and the switcher pill so the evaluation tutorial can
// spotlight them.
const registerTutorialRef = inject(TUTORIAL_REF_REGISTRY_KEY, null)
const collapseButtonRef = useTemplateRef<HTMLElement>('collapseButton')
watchEffect(() => {
  registerTutorialRef?.('evalCollapse', collapseButtonRef.value ?? null)
})
onBeforeUnmount(() => registerTutorialRef?.('evalCollapse', null))

// Fit the graph into the band above the sheet only when it reaches the standard (half)
// detent — the everyday view where the graph would otherwise sit under the sheet. Compact
// leaves the graph alone (it's mostly visible), and closing / collapsing does not re-fit,
// so the user's view is only nudged when expanding to half.
const refitAboveSheet = inject(SHEET_REFIT_KEY, null)
watch([open, detentIndex], () => {
  if (!refitAboveSheet || !open.value || detentLayout.value !== 'standard') return
  nextTick(() => refitAboveSheet(SNAP_POINTS[1]!))
})

// The active config, surfaced as the header pill (kind glyph + name + chevron).
const activeChip = computed(() => chips.find((c) => c.id === activeId.value))

// The header pill opens a switcher panel (switch / delete / add) that floats upward from
// the pill into the empty canvas above the docked sheet, so it is never clipped by the
// short compact sheet. The panel has two modes: the config list, and — for multi-kind
// modules — an add-kind chooser reached from its Add row.
const listOpen = ref(false)
const panelMode = ref<'list' | 'kinds'>('list')

const trigger = useTemplateRef<HTMLElement>('trigger')
const panel = useTemplateRef<HTMLElement>('panel')
const { floatingStyles } = useFloating(trigger, panel, {
  placement: 'top-start',
  middleware: [offset(8), flip(), shift({ padding: 12 })],
  whileElementsMounted: autoUpdate,
})

watchEffect(() => registerTutorialRef?.('evalSwitcher', trigger.value ?? null))
onBeforeUnmount(() => registerTutorialRef?.('evalSwitcher', null))

function openPanel() {
  panelMode.value = 'list'
  listOpen.value = true
}
function closePanel() {
  listOpen.value = false
  panelMode.value = 'list'
}
function togglePanel() {
  if (listOpen.value) closePanel()
  else openPanel()
}

// A newly created eval needs its selectors, so lift a compact sheet to standard.
function ensureStandardDetent() {
  if (detentIndex.value < 1) detentIndex.value = 1
}

// Header toggle between the compact and standard (half) detents.
const isExpanded = computed(() => detentIndex.value >= 1)
function toggleDetent() {
  detentIndex.value = isExpanded.value ? 0 : 1
}

// Compact detent sizing: fit the sheet to its content up to three result rows, then
// scroll. The `mt-auto` sticky footer stretches its container, so we can't read a
// natural height off one box — instead we sum the naturally-sized pieces (the chrome
// above the results, the row-capped results, and the footer). Only measured at the
// compact detent, where the parameters are folded away. Every result renderer (grid,
// ranking, probabilities, …) tags its results element with `data-evaluation-results`.
const MAX_ROWS = 3
const ROW_GAP = 8 // result rows sit in a gap-2 flow
const RESULTS_TO_FOOTER_GAP = 10 // MobileEvaluationBody gap-2.5
const content = useTemplateRef<HTMLElement>('content')
const compactDetentPx = ref<number | null>(null)
let gridObserver: ResizeObserver | undefined

// Inactive configs stay mounted under v-show, so several grids/footers coexist in the
// DOM; only the active one has a layout box. Pick that one.
function firstVisible(root: HTMLElement, selector: string): HTMLElement | null {
  for (const el of root.querySelectorAll<HTMLElement>(selector)) {
    if (el.getBoundingClientRect().width > 0) return el
  }
  return null
}

function measureCompactDetent() {
  const root = content.value
  if (!open.value || root === null || detentLayout.value !== 'compact') return
  const panel = root.closest<HTMLElement>('.sheet-panel')
  const results = firstVisible(root, '[data-evaluation-results]')
  if (panel === null || results === null) {
    compactDetentPx.value = null
    return
  }
  const resultsRect = results.getBoundingClientRect()
  const aboveResults = resultsRect.top - panel.getBoundingClientRect().top
  const firstRow = results.firstElementChild
  const rowHeight = firstRow?.getBoundingClientRect().height ?? resultsRect.height
  const cappedResults = Math.min(
    resultsRect.height,
    rowHeight * MAX_ROWS + ROW_GAP * (MAX_ROWS - 1),
  )
  const footerHeight =
    firstVisible(root, '[data-evaluation-footer]')?.getBoundingClientRect().height ?? 0
  const padBottom = parseFloat(getComputedStyle(panel).paddingBottom) || 0
  compactDetentPx.value = Math.ceil(
    aboveResults + cappedResults + RESULTS_TO_FOOTER_GAP + footerHeight + padBottom,
  )
}

// Re-attach the observer to the active results element (a different one shows on config
// switch) and remeasure.
function refreshCompactMeasure() {
  gridObserver?.disconnect()
  const results = content.value ? firstVisible(content.value, '[data-evaluation-results]') : null
  if (results && typeof ResizeObserver !== 'undefined') {
    gridObserver = new ResizeObserver(() => measureCompactDetent())
    gridObserver.observe(results)
  }
  measureCompactDetent()
}

watch([open, activeId, detentLayout], () => nextTick(refreshCompactMeasure), { flush: 'post' })

onBeforeUnmount(() => gridObserver?.disconnect())

function onAddClick() {
  if (addKinds.length <= 1) {
    emit('add', addKinds[0] ?? 'extension')
    closePanel()
    ensureStandardDetent()
  } else {
    // Multi-kind: reveal the kind chooser inside the same floating panel.
    listOpen.value = true
    panelMode.value = 'kinds'
  }
}

function chooseKind(kind: EvaluationKind) {
  emit('add', kind)
  closePanel()
  ensureStandardDetent()
}

function selectChip(id: string) {
  activeId.value = id
  closePanel()
}

watch(open, (isOpen) => {
  if (!isOpen) closePanel()
})

function selectLast() {
  activeId.value = chips.length > 0 ? chips[chips.length - 1]!.id : undefined
}

// A config highlights the canvas only while the sheet is open (mirrors desktop's
// active-window behaviour); closing the sheet clears the active selection but remembers
// it, so reopening restores the same config instead of jumping to the last one.
let rememberedActiveId: string | undefined
watch(open, (isOpen) => {
  if (!isOpen) {
    rememberedActiveId = activeId.value
    activeId.value = undefined
    return
  }
  // Single-kind modules skip the empty "Add evaluation" step: opening the sheet drops
  // you straight into the default eval's setup, mirroring the desktop evaluation window.
  // Multi-kind modules (e.g. AF) still show the chooser so the user picks the kind.
  if (chips.length === 0 && addKinds.length <= 1) {
    emit('add', addKinds[0] ?? 'extension')
    ensureStandardDetent()
    return
  }
  if (chips.some((c) => c.id === rememberedActiveId)) activeId.value = rememberedActiveId
  else if (!chips.some((c) => c.id === activeId.value)) selectLast()
})

// While open, keep a valid config selected as chips are added or removed: a newly added
// config becomes active (found by id diff, since chips aren't ordered by insertion), and
// removing the active one falls back to the last remaining config.
let knownChipIds = chips.map((c) => c.id)
watch(
  () => chips.map((c) => c.id).join('|'),
  () => {
    const ids = chips.map((c) => c.id)
    if (open.value) {
      const added = ids.find((id) => !knownChipIds.includes(id))
      if (added !== undefined) activeId.value = added
      else if (!ids.some((id) => id === activeId.value)) selectLast()
    }
    knownChipIds = ids
  },
)
</script>

<template>
  <!-- Non-modal docked sheet: the graph stays visible and interactive above it, and
       tapping the canvas does not dismiss it. Three detents — compact / standard / full. -->
  <BottomSheet
    v-model:open="open"
    v-model:detent-index="detentIndex"
    :title="t('editor.toolbar.evaluate')"
    :modal="false"
    :snap-points="SNAP_POINTS"
    :lowest-detent-px="compactDetentPx"
    :initial-detent-index="1"
  >
    <!-- Header-as-switcher: the active config IS the header; the chevron drops the
         full saved-config list. One control does what the pill strip + title did. -->
    <template #header="{ close }">
      <button
        ref="trigger"
        type="button"
        class="flex-1 min-w-0 flex items-center gap-2 h-10 px-3 rounded-xl border text-left transition-colors"
        :class="listOpen ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-200/60'"
        :aria-expanded="listOpen"
        @click="togglePanel"
      >
        <KindIcon
          v-if="activeChip"
          :kind="activeChip.kind"
          class="size-[1.05rem] shrink-0 text-primary"
        />
        <span class="flex-1 min-w-0 truncate text-sm font-semibold">{{
          activeChip?.label ?? t('editor.toolbar.evaluate')
        }}</span>
        <ChevronDownIcon
          class="size-4 shrink-0 opacity-60 transition-transform"
          :class="listOpen && 'rotate-180'"
        />
      </button>
      <button
        ref="collapseButton"
        type="button"
        class="btn btn-square size-11 btn-ghost shrink-0"
        :aria-label="isExpanded ? t('evaluation.collapseSheet') : t('evaluation.expandSheet')"
        @click="toggleDetent"
      >
        <ChevronDownIcon v-if="isExpanded" class="size-5" />
        <ChevronUpIcon v-else class="size-5" />
      </button>
      <button
        type="button"
        class="btn btn-square size-11 btn-ghost shrink-0"
        :aria-label="t('common.actions.close')"
        @click="close"
      >
        <XMarkIcon class="size-5" />
      </button>
    </template>

    <div ref="content" class="relative flex flex-col gap-3 min-h-full">
      <div class="flex-1 min-h-0 flex flex-col gap-3">
        <div v-if="chips.length === 0" class="flex flex-col items-center gap-3 py-10 text-center">
          <p class="opacity-60 text-sm">{{ t('evaluation.noEvaluationYet') }}</p>
          <!-- Multi-kind modules offer a button per kind directly; single-kind keeps one. -->
          <template v-if="addKinds.length > 1">
            <button
              v-for="kind in addKinds"
              :key="kind"
              type="button"
              class="btn btn-primary btn-outline w-56 justify-start gap-3 px-4"
              @click="chooseKind(kind)"
            >
              <KindIcon :kind="kind" class="size-5 shrink-0" />
              <span class="flex-1 text-left">{{ kindLabel[kind] }}</span>
            </button>
          </template>
          <button v-else class="btn btn-primary gap-2" @click="onAddClick">
            <PlusIcon class="size-5" /> {{ t('evaluation.addEvaluation') }}
          </button>
        </div>

        <slot v-if="chips.length > 0" :active-id="activeId" />
      </div>
    </div>

    <!-- Switcher panel: floats upward from the header pill into the canvas above the
         sheet (flips down only if there is no room), so it is never clipped. -->
    <Teleport to="body">
      <template v-if="listOpen">
        <button
          class="fixed inset-0 z-60 cursor-default"
          :aria-label="t('evaluation.closeSwitcher')"
          @click="closePanel"
        ></button>
        <div
          ref="panel"
          :style="[floatingStyles, { zIndex: 61 }]"
          class="w-[min(20rem,calc(100vw-1.5rem))] max-h-[70dvh] overflow-y-auto rounded-2xl border border-base-300 bg-base-100 shadow-xl"
          role="menu"
        >
          <template v-if="panelMode === 'list'">
            <template v-for="(chip, index) in chips" :key="chip.id">
              <div v-if="index > 0" class="h-px bg-base-200 mx-3"></div>
              <div
                class="flex items-center gap-3 pl-3 pr-1 h-12"
                :class="chip.id === activeId && 'bg-primary/5'"
              >
                <button
                  type="button"
                  class="flex-1 min-w-0 flex items-center gap-3 h-full text-left"
                  @click="selectChip(chip.id)"
                >
                  <KindIcon
                    :kind="chip.kind"
                    class="size-[1.05rem] shrink-0"
                    :class="chip.id === activeId ? 'text-primary' : 'opacity-60'"
                  />
                  <span
                    class="flex-1 min-w-0 truncate text-sm"
                    :class="chip.id === activeId ? 'font-semibold text-primary' : 'font-medium'"
                    >{{ chip.label }}</span
                  >
                  <CheckIcon v-if="chip.id === activeId" class="size-4 text-success shrink-0" />
                </button>
                <button
                  type="button"
                  class="btn btn-square btn-sm btn-ghost text-error/70 shrink-0"
                  :aria-label="t('evaluation.removeEvaluation')"
                  @click="emit('remove', chip.id)"
                >
                  <TrashIcon class="size-4" />
                </button>
              </div>
            </template>
            <div v-if="chips.length > 0" class="h-px bg-base-200 mx-3"></div>
            <button
              type="button"
              class="flex items-center gap-3 px-3 h-12 w-full text-left text-primary"
              @click="onAddClick"
            >
              <PlusIcon class="size-5 shrink-0" />
              <span class="text-sm font-medium">{{ t('evaluation.addEvaluation') }}</span>
            </button>
          </template>

          <template v-else>
            <button
              type="button"
              class="flex items-center gap-2 px-2 h-11 w-full text-left"
              @click="panelMode = 'list'"
            >
              <ChevronLeftIcon class="size-5 shrink-0 opacity-60" />
              <span class="text-sm font-semibold">{{ t('evaluation.addEvaluation') }}</span>
            </button>
            <div class="h-px bg-base-200 mx-3"></div>
            <button
              v-for="kind in addKinds"
              :key="kind"
              type="button"
              class="flex items-center gap-3 px-3 h-12 w-full text-left"
              @click="chooseKind(kind)"
            >
              <KindIcon :kind="kind" class="size-[1.05rem] shrink-0 text-primary" />
              <span class="flex-1 text-sm font-medium">{{ kindLabel[kind] }}</span>
              <ChevronRightIcon class="size-4 shrink-0 opacity-30" />
            </button>
          </template>
        </div>
      </template>
    </Teleport>
  </BottomSheet>
</template>
