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
<script lang="ts">
import type { InjectionKey } from 'vue'

// Module-scope symbols so all HoverTooltip instances share the same injection key.
const ANCESTOR_KEEP_OPEN_FNS: InjectionKey<Array<() => void>> = Symbol('hoverTooltipKeepOpen')
const ANCESTOR_SCHEDULE_CLOSE_FNS: InjectionKey<Array<() => void>> = Symbol(
  'hoverTooltipScheduleClose',
)
const NESTING_DEPTH: InjectionKey<number> = Symbol('hoverTooltipDepth')
</script>

<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import { computed, inject, onBeforeUnmount, provide, ref, useTemplateRef, watch } from 'vue'

import { useLayoutMode } from '@/modules/common/layout/useLayoutMode'

defineOptions({ inheritAttrs: false })

// Desktop only: how long a term must stay hovered before its panel becomes
// interactive ("sticky"). A quicker pass-over shows the panel briefly but never
// makes it grabbable, so the pointer can travel on to what's underneath.
const STICKY_GRACE_MS = 350

const { placement = 'bottom', triggerClass = 'cursor-help border-b border-dotted border-info' } =
  defineProps<{
    placement?: Placement
    /** Styling for the trigger span; defaults to the dotted-underline text-term look. */
    triggerClass?: string
  }>()

const triggerEl = useTemplateRef('trigger')
const panelEl = useTemplateRef('panel')

// On touch layouts hover never fires, so the term toggles the panel on tap instead.
const { isCompact: tapMode } = useLayoutMode()

const depth = inject(NESTING_DEPTH, 0)
const ancestorKeepOpenFns = inject(ANCESTOR_KEEP_OPEN_FNS, [])
const ancestorScheduleCloseFns = inject(ANCESTOR_SCHEDULE_CLOSE_FNS, [])

const isOpen = ref(false)
// idle → charging (grace period) → charged (interactive/sticky). Drives the header
// rule's charge-up animation and whether the panel accepts pointer events.
const chargeState = ref<'idle' | 'charging' | 'charged'>('idle')
let closeTimer: ReturnType<typeof setTimeout> | null = null
let chargeTimer: ReturnType<typeof setTimeout> | null = null

// The panel only grabs the pointer once charged; while charging it's click-through
// (tap layouts are interactive as soon as they open).
const panelInteractive = computed(() => tapMode.value || chargeState.value === 'charged')

const { floatingStyles } = useFloating(triggerEl, panelEl, {
  placement,
  middleware: [offset(6), flip(), shift({ padding: 8 })],
  whileElementsMounted: autoUpdate,
})

function clearCloseTimer() {
  if (closeTimer !== null) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function clearChargeTimer() {
  if (chargeTimer !== null) {
    clearTimeout(chargeTimer)
    chargeTimer = null
  }
}

function keepOpen() {
  clearCloseTimer()
  isOpen.value = true
}

function closeNow() {
  clearCloseTimer()
  clearChargeTimer()
  isOpen.value = false
  chargeState.value = 'idle'
}

// Open the panel and start the dwell timer; once it fires the panel turns sticky.
function beginCharge() {
  clearCloseTimer()
  isOpen.value = true
  if (chargeState.value === 'charged') return
  chargeState.value = 'charging'
  clearChargeTimer()
  chargeTimer = setTimeout(() => {
    chargeState.value = 'charged'
    chargeTimer = null
  }, STICKY_GRACE_MS)
}

function scheduleClose() {
  closeTimer = setTimeout(() => {
    isOpen.value = false
    chargeState.value = 'idle'
  }, 150)
  // When this tooltip closes, ancestors should close too if nothing else keeps them open.
  ancestorScheduleCloseFns.forEach((fn) => fn())
}

function onEnter() {
  if (tapMode.value) return
  beginCharge()
  // Keep all ancestor tooltips open while this one (or a descendant) is hovered.
  ancestorKeepOpenFns.forEach((fn) => fn())
}

function onLeave() {
  if (tapMode.value) return
  // Sticky panels linger so the pointer can reach them; a still-charging one just
  // closes, so a quick pass never leaves a grabbable panel behind.
  if (chargeState.value === 'charged') {
    scheduleClose()
  } else {
    closeNow()
  }
}

function onTap(event: MouseEvent) {
  if (!tapMode.value) return
  event.stopPropagation()
  if (isOpen.value) {
    isOpen.value = false
    chargeState.value = 'idle'
  } else {
    keepOpen()
    chargeState.value = 'charged'
    // Keep ancestors open too, so tapping a nested term doesn't collapse the chain.
    ancestorKeepOpenFns.forEach((fn) => fn())
  }
}

// A tap anywhere outside this term and its panel closes it; keepOpen (from a descendant
// tap) cancels the pending close, so only truly-outside taps dismiss.
function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (target === null) return
  if (triggerEl.value?.contains(target) || panelEl.value?.contains(target)) return
  scheduleClose()
}

watch(isOpen, (open) => {
  if (!tapMode.value) return
  if (open) {
    document.addEventListener('pointerdown', onDocumentPointerDown, true)
  } else {
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  }
})

onBeforeUnmount(() => {
  clearCloseTimer()
  clearChargeTimer()
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
})

// Expose this tooltip's functions to descendants, chained with any ancestor functions.
provide(ANCESTOR_KEEP_OPEN_FNS, [...ancestorKeepOpenFns, keepOpen])
provide(ANCESTOR_SCHEDULE_CLOSE_FNS, [...ancestorScheduleCloseFns, scheduleClose])
provide(NESTING_DEPTH, depth + 1)
</script>

<template>
  <span
    ref="trigger"
    v-bind="$attrs"
    :class="triggerClass"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
    @click="onTap"
  >
    <slot />
  </span>
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="panel"
      :style="[floatingStyles, { zIndex: 9000 + depth }]"
      class="max-w-xs rounded-box bg-base-100 border border-base-300 shadow-lg p-3 text-sm"
      :class="{ 'pointer-events-none': !panelInteractive }"
      @mouseenter="onEnter"
      @mouseover="keepOpen"
      @mouseleave="onLeave"
    >
      <slot name="content" :charge-state="chargeState" :grace-ms="STICKY_GRACE_MS" />
    </div>
  </Teleport>
</template>
