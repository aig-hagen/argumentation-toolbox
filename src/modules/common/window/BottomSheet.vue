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
import { XMarkIcon } from '@heroicons/vue/24/solid'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

import { useVisualViewport } from '@/modules/common/layout/useVisualViewport'

const { t } = useI18n({ useScope: 'global' })

const open = defineModel<boolean>('open', { required: true })

const {
  title,
  fullHeight = false,
  modal = true,
  snapPoints,
  lowestDetentPx = null,
  initialDetentIndex = 0,
} = defineProps<{
  title: string
  /** Start expanded to the full snap point instead of sizing to content. */
  fullHeight?: boolean
  /** Detent the sheet opens at (index into snapPoints); ignored when fullHeight. */
  initialDetentIndex?: number
  /** Modal (default): a backdrop blocks and dismisses. Non-modal: no backdrop, so
      the content behind the sheet stays visible and interactive. */
  modal?: boolean
  /** Ascending fractions of the viewport height (e.g. [0.45, 0.9]) the sheet snaps
      between when the handle is dragged; a drag below the lowest one dismisses it.
      Without it the sheet sizes to its content — for a docked, non-modal sheet. */
  snapPoints?: number[]
  /** Override the lowest detent with a measured pixel height (clamped to the next
      detent), so it can size to its content instead of a fixed fraction. */
  lowestDetentPx?: number | null
}>()

const emit = defineEmits<{ close: [] }>()

const sheet = useTemplateRef<HTMLElement>('sheet')
const sheetBody = useTemplateRef<HTMLElement>('sheetBody')
const titleId = useId()

const { keyboardInset } = useVisualViewport()

// Detent mode: when snapPoints are given the sheet has fixed heights it snaps
// between; otherwise it sizes to its content (or to full when fullHeight is set).
const isDetent = computed(() => snapPoints !== undefined && snapPoints.length > 0)

// Viewport height in px, for resolving snap-point fractions to concrete heights.
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0)
function updateViewportHeight() {
  viewportHeight.value = window.innerHeight
}

onMounted(() => {
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportHeight)
})

// Which snap point is settled, and — while dragging — the live height the finger drives.
// Exposed as a model so a docked host can react to the detent (e.g. fold parameters away).
const activeIndex = defineModel<number>('detentIndex', { default: 0 })
const liveHeight = ref<number | null>(null)
function detentPx(index: number): number {
  const points = snapPoints ?? []
  const clamped = Math.min(Math.max(index, 0), points.length - 1)
  if (clamped === 0 && lowestDetentPx != null && lowestDetentPx > 0) {
    // Content-sized lowest detent, never taller than the next detent up.
    const next = (points[1] ?? points[0] ?? 0) * viewportHeight.value
    return next > 0 ? Math.min(lowestDetentPx, next) : lowestDetentPx
  }
  return (points[clamped] ?? 0) * viewportHeight.value
}
function nearestDetent(height: number): number {
  const points = snapPoints ?? []
  let best = 0
  let bestDistance = Infinity
  for (let i = 0; i < points.length; i++) {
    const distance = Math.abs(detentPx(i) - height)
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  }
  return best
}

const panelHeight = computed(() => {
  if (isDetent.value) {
    const height =
      dragging.value && liveHeight.value !== null ? liveHeight.value : detentPx(activeIndex.value)
    return `${Math.round(height)}px`
  }
  return fullHeight ? 'var(--sheet-max-height)' : undefined
})

const expanded = computed(() =>
  isDetent.value ? activeIndex.value === (snapPoints?.length ?? 1) - 1 : fullHeight,
)

// Expanding to the top detent reveals the extra height above the body's current scroll,
// so snap back to the top — otherwise the just-revealed selectors stay scrolled out of view.
watch(activeIndex, (index) => {
  if (isDetent.value && index === (snapPoints?.length ?? 1) - 1) {
    nextTick(() => sheetBody.value?.scrollTo({ top: 0, behavior: 'smooth' }))
  }
})

// Downward drag offset in px (below the lowest detent) while dragging; 0 when settled.
const dragOffset = ref(0)
const dragging = ref(false)

// Beyond this downward drag on release, the sheet is dismissed.
const CLOSE_THRESHOLD = 120

function resetToInitial() {
  if (isDetent.value) {
    const last = (snapPoints?.length ?? 1) - 1
    activeIndex.value = fullHeight ? last : Math.min(Math.max(initialDetentIndex, 0), last)
  } else {
    activeIndex.value = 0
  }
  liveHeight.value = null
  dragOffset.value = 0
}

let restoreFocus: HTMLElement | null = null
let dragStartY = 0
let dragStartHeight = 0
let pointerId: number | null = null

const bottomInset = computed(() => `max(env(safe-area-inset-bottom), ${keyboardInset.value}px)`)

function close() {
  open.value = false
}

watch(open, async (isOpen, wasOpen) => {
  if (isOpen && !wasOpen) {
    restoreFocus = document.activeElement as HTMLElement | null
    resetToInitial()
    // A non-modal sheet must not steal focus from the content behind it.
    if (modal) {
      await nextTick()
      focusFirst()
    }
  } else if (!isOpen && wasOpen) {
    emit('close')
    restoreFocus?.focus?.()
    restoreFocus = null
  }
})

function focusableElements(): HTMLElement[] {
  const root = sheet.value
  if (!root) return []
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((el) => el.offsetParent !== null || el === document.activeElement)
}

function focusFirst() {
  const [first] = focusableElements()
  ;(first ?? sheet.value)?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  // Only a modal sheet traps Tab; a docked sheet lets focus reach the canvas behind.
  if (event.key !== 'Tab' || !modal) return
  const focusable = focusableElements()
  if (focusable.length === 0) {
    event.preventDefault()
    return
  }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || active === sheet.value)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function onHandlePointerDown(event: PointerEvent) {
  dragging.value = true
  dragStartY = event.clientY
  pointerId = event.pointerId
  dragStartHeight = detentPx(activeIndex.value)
  liveHeight.value = dragStartHeight
  dragOffset.value = 0
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onHandlePointerMove(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== pointerId) return
  const delta = event.clientY - dragStartY
  if (!isDetent.value) {
    dragOffset.value = Math.max(0, delta)
    return
  }
  // Height follows the finger between the lowest and highest detent; dragging below
  // the lowest instead slides the whole sheet down (via dragOffset) toward dismissal.
  const minHeight = detentPx(0)
  const maxHeight = detentPx((snapPoints?.length ?? 1) - 1)
  const target = dragStartHeight - delta
  if (target >= minHeight) {
    liveHeight.value = Math.min(target, maxHeight)
    dragOffset.value = 0
  } else {
    liveHeight.value = minHeight
    dragOffset.value = minHeight - target
  }
}

function onHandlePointerUp(event: PointerEvent) {
  if (!dragging.value || event.pointerId !== pointerId) return
  dragging.value = false
  pointerId = null
  if (dragOffset.value > CLOSE_THRESHOLD) {
    close()
  } else if (isDetent.value && liveHeight.value !== null) {
    activeIndex.value = nearestDetent(liveHeight.value)
  }
  liveHeight.value = null
  dragOffset.value = 0
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div
        v-if="open && modal"
        class="sheet-backdrop fixed inset-0 z-50 bg-scrim"
        @pointerdown="close"
        aria-hidden="true"
      ></div>
    </Transition>
    <Transition name="sheet-slide">
      <div
        v-if="open"
        ref="sheet"
        role="dialog"
        :aria-modal="modal"
        :aria-labelledby="$slots.header ? undefined : titleId"
        :aria-label="$slots.header ? title : undefined"
        tabindex="-1"
        class="sheet-panel fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-base-100 shadow-lg/30 outline-none"
        :class="{
          'sheet-panel--dragging': dragging,
          'border-t border-base-content/20': !modal,
        }"
        :style="{
          transform: `translateY(${dragOffset}px)`,
          height: panelHeight,
          paddingBottom: bottomInset,
          '--sheet-max-height': '90dvh',
        }"
        @keydown="onKeydown"
      >
        <div
          class="sheet-grab shrink-0 flex justify-center pt-2 pb-1 cursor-grab touch-none"
          @pointerdown="onHandlePointerDown"
          @pointermove="onHandlePointerMove"
          @pointerup="onHandlePointerUp"
          @pointercancel="onHandlePointerUp"
        >
          <span class="block h-1 w-9 rounded-full bg-base-content/25" aria-hidden="true"></span>
        </div>
        <!-- A consumer may replace the whole header row (e.g. the evaluation
             header-as-switcher pill); otherwise a plain title + close is shown. -->
        <header class="shrink-0 flex items-center gap-2 px-4 pb-2">
          <slot v-if="$slots.header" name="header" :close="close" />
          <template v-else>
            <h2 :id="titleId" class="flex-1 min-w-0 truncate text-base font-medium">{{ title }}</h2>
            <slot name="header-actions" />
            <button
              type="button"
              class="btn btn-square size-11 btn-ghost shrink-0"
              :aria-label="t('common.actions.close')"
              @click="close"
            >
              <XMarkIcon class="size-5" />
            </button>
          </template>
        </header>
        <div ref="sheetBody" class="sheet-body flex-1 overflow-y-auto overscroll-contain px-4">
          <slot
            :expanded="expanded"
            :detent-index="activeIndex"
            :detent-count="snapPoints?.length ?? 1"
          />
        </div>
        <footer v-if="$slots.footer" class="shrink-0 border-t border-base-300 px-4 pt-3">
          <slot name="footer" />
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-panel {
  max-height: var(--sheet-max-height);
  touch-action: none;
}

.sheet-body {
  touch-action: pan-y;
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 0.2s ease;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

/* Not while dragging: the pointer drives the transform directly. */
.sheet-panel:not(.sheet-panel--dragging) {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%) !important;
}

@media (prefers-reduced-motion: reduce) {
  .sheet-fade-enter-active,
  .sheet-fade-leave-active,
  .sheet-slide-enter-active,
  .sheet-slide-leave-active,
  .sheet-panel:not(.sheet-panel--dragging) {
    transition: none;
  }
}
</style>
