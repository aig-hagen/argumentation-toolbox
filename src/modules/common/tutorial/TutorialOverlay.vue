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
import { autoUpdate, offset, useFloating } from '@floating-ui/vue'
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  useTemplateRef,
  watch,
  watchEffect,
} from 'vue'
import { useI18n } from 'vue-i18n'

import TermTooltip from '@/modules/common/tooltip/TermTooltip.vue'
import type { Tutorial, TutorialBodyPart, TutorialContext } from '@/modules/common/tutorial/types'
import { TUTORIAL_INSTANCE_KEY, useTutorial } from '@/modules/common/tutorial/useTutorial'

const { tutorials, defaultTutorialId, refs, context, isTouchDevice } = defineProps<{
  tutorials: Tutorial[]
  defaultTutorialId?: string
  refs: Record<string, HTMLElement | null>
  context: TutorialContext
  isTouchDevice: boolean
}>()

const {
  autoStartedTutorials,
  isTutorialDone,
  currentStep,
  stepCount,
  activeStepIndex,
  activeOwnerId,
  baselineContext,
  isActive,
  isLastStep,
  startTutorial,
  nextStep,
  prevStep,
  skipTutorial,
  completeTutorial,
} = useTutorial()

const instanceId = inject(TUTORIAL_INSTANCE_KEY, '')
const { t } = useI18n({ useScope: 'global' })

// This overlay only renders if no other tab owns the active tutorial.
const isOwner = computed(() => !isActive.value || activeOwnerId.value === instanceId)

onMounted(() => {
  if (
    defaultTutorialId &&
    !autoStartedTutorials.value.includes(defaultTutorialId) &&
    !isTutorialDone(defaultTutorialId)
  ) {
    const tutorial = tutorials.find((t) => t.id === defaultTutorialId)
    if (tutorial) {
      nextTick(() => {
        autoStartedTutorials.value = [...autoStartedTutorials.value, defaultTutorialId]
        startTutorial(tutorial, context, instanceId)
      })
    }
  }
})

onUnmounted(() => {
  if (activeOwnerId.value === instanceId) {
    skipTutorial()
  }
})

// Auto-advance whenever a step declares an advanceCondition — including `advanceOn: 'button'`
// steps, which then offer a manual Next *and* advance when the user does the action.
watchEffect(() => {
  if (!isOwner.value || !isActive.value || !currentStep.value) return
  if (!currentStep.value.advanceCondition) return
  if (!baselineContext.value) return
  if (currentStep.value.advanceCondition(context, baselineContext.value)) {
    nextStep(context)
  }
})

const anchorRef = computed<HTMLElement | null>(() => {
  if (!currentStep.value?.anchor) return null
  return refs[currentStep.value.anchor] ?? null
})

const isAnchored = computed(() => anchorRef.value !== null)

const highlightRef = computed<HTMLElement | null>(() => {
  if (!currentStep.value) return null
  const h = currentStep.value.highlight
  if (!h) return null
  const key = typeof h === 'function' ? h(isTouchDevice) : h
  if (!key) return null
  return refs[key] ?? null
})
// The highlighted element may live inside a draggable evaluation window that moves via JS
// transforms (no scroll/resize event), so measure its rect directly each frame while a spotlight
// is shown — keeping the ring glued to it from the first frame and as the window moves.
const hlX = ref(0)
const hlY = ref(0)
const hlW = ref(0)
const hlH = ref(0)
const hasHighlight = computed(() => hlW.value > 0)
let highlightRaf: number | null = null
function trackHighlight() {
  const el = highlightRef.value
  if (el) {
    const r = el.getBoundingClientRect()
    hlX.value = r.x
    hlY.value = r.y
    hlW.value = r.width
    hlH.value = r.height
  } else {
    hlW.value = 0
  }
  highlightRaf = requestAnimationFrame(trackHighlight)
}
watch(
  () => highlightRef.value !== null,
  (present) => {
    if (present && highlightRaf === null) trackHighlight()
    else if (!present && highlightRaf !== null) {
      cancelAnimationFrame(highlightRaf)
      highlightRaf = null
      hlW.value = 0
    }
  },
  { immediate: true },
)
onUnmounted(() => {
  if (highlightRaf !== null) cancelAnimationFrame(highlightRaf)
})
const highlightStyle = computed(() => ({
  left: `${hlX.value}px`,
  top: `${hlY.value}px`,
  width: `${hlW.value}px`,
  height: `${hlH.value}px`,
}))

const resolvedAdvanceOn = computed<'button' | 'action'>(() => {
  const a = currentStep.value?.advanceOn
  if (!a) return 'button'
  return typeof a === 'function' ? a(isTouchDevice) : a
})

const bodyParts = computed<TutorialBodyPart[]>(() => {
  if (!currentStep.value) return []
  const body = currentStep.value.body
  const resolved = typeof body === 'function' ? body(isTouchDevice) : body
  return typeof resolved === 'string' ? [resolved] : resolved
})

const nextTutorial = computed(() => {
  if (!currentStep.value?.nextTutorialId) return null
  return tutorials.find((t) => t.id === currentStep.value!.nextTutorialId) ?? null
})

function handleNext() {
  nextStep(context)
}

function handlePrev() {
  prevStep(context)
}

function handleDone() {
  completeTutorial()
}

function handleStartNext() {
  const next = nextTutorial.value
  if (!next) return
  completeTutorial()
  startTutorial(next, context, instanceId)
}

// Floating-ui setup for anchored steps
const floatingEl = useTemplateRef<HTMLElement>('floating')

const { floatingStyles } = useFloating(anchorRef, floatingEl, {
  placement: computed(() => currentStep.value?.placement ?? 'right-start'),
  middleware: computed(() => [offset(currentStep.value?.offsetPx ?? 64)]),
  whileElementsMounted: autoUpdate,
})
</script>

<template>
  <template v-if="isOwner && isActive && currentStep">
    <!-- Spotlight ring over a highlighted element (no card movement). -->
    <div
      v-if="hasHighlight"
      class="fixed z-1100 pointer-events-none rounded-2xl spotlight-pulse"
      :style="highlightStyle"
    ></div>

    <!-- Anchored step: floats next to a UI element -->
    <div v-if="isAnchored" ref="floating" :style="floatingStyles" class="z-50 pointer-events-auto">
      <div class="card bg-base-100 shadow-xl w-72 border border-base-300">
        <div class="card-body p-4 gap-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-base-content/50 font-medium">
              {{ activeStepIndex + 1 }} / {{ stepCount }}
            </span>
            <progress
              class="progress progress-info flex-1"
              :value="activeStepIndex + 1"
              :max="stepCount"
            ></progress>
          </div>
          <h3 class="card-title text-sm">{{ currentStep.title }}</h3>
          <div class="text-sm text-base-content/80 leading-relaxed">
            <template v-for="(part, i) in bodyParts" :key="i">
              <TermTooltip v-if="typeof part === 'object'" :id="part.tooltipId">{{
                part.text
              }}</TermTooltip>
              <span v-else class="contents" v-html="part"></span>
            </template>
          </div>
          <div class="flex items-center justify-between gap-2 pt-1">
            <button v-if="activeStepIndex > 0" class="btn btn-ghost btn-xs" @click="handlePrev">
              ← {{ t('tutorial.controls.back') }}
            </button>
            <div v-else class="flex-0"></div>
            <div class="flex items-center gap-2">
              <button
                v-if="!isLastStep"
                class="btn btn-ghost btn-xs text-base-content/50"
                @click="skipTutorial"
              >
                {{ t('tutorial.controls.skip') }}
              </button>
              <template v-if="isLastStep">
                <button
                  v-if="nextTutorial"
                  class="btn btn-secondary btn-xs"
                  @click="handleStartNext"
                >
                  ▶ {{ nextTutorial.name }}
                </button>
                <button class="btn btn-primary btn-xs" @click="handleDone">
                  {{ t('tutorial.controls.done') }}
                </button>
              </template>
              <button
                v-else-if="resolvedAdvanceOn === 'button'"
                class="btn btn-primary btn-xs"
                @click="handleNext"
              >
                {{ t('tutorial.controls.next') }} →
              </button>
              <span v-else class="text-xs text-base-content/40 italic">{{
                t('tutorial.controls.waiting')
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Unanchored step: fixed to top-right of editor container -->
    <div v-else class="absolute top-4 right-4 z-50 pointer-events-auto">
      <div class="card bg-base-100 shadow-xl w-80 border border-base-300">
        <div class="card-body p-4 gap-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs text-base-content/50 font-medium">
              {{ activeStepIndex + 1 }} / {{ stepCount }}
            </span>
            <progress
              class="progress progress-info flex-1"
              :value="activeStepIndex + 1"
              :max="stepCount"
            ></progress>
          </div>
          <h3 class="card-title text-sm">{{ currentStep.title }}</h3>
          <div class="text-sm text-base-content/80 leading-relaxed">
            <template v-for="(part, i) in bodyParts" :key="i">
              <TermTooltip v-if="typeof part === 'object'" :id="part.tooltipId">{{
                part.text
              }}</TermTooltip>
              <span v-else class="contents" v-html="part"></span>
            </template>
          </div>
          <div class="flex items-center justify-between gap-2 pt-1">
            <button v-if="activeStepIndex > 0" class="btn btn-ghost btn-xs" @click="handlePrev">
              ← {{ t('tutorial.controls.back') }}
            </button>
            <div v-else class="flex-0"></div>
            <div class="flex items-center gap-2">
              <button
                v-if="!isLastStep"
                class="btn btn-ghost btn-xs text-base-content/50"
                @click="skipTutorial"
              >
                {{ t('tutorial.controls.skipTutorial') }}
              </button>
              <template v-if="isLastStep">
                <button
                  v-if="nextTutorial"
                  class="btn btn-secondary btn-xs"
                  @click="handleStartNext"
                >
                  ▶ {{ nextTutorial.name }}
                </button>
                <button class="btn btn-primary btn-xs" @click="handleDone">
                  {{ t('tutorial.controls.done') }}
                </button>
              </template>
              <button
                v-else-if="resolvedAdvanceOn === 'button'"
                class="btn btn-primary btn-xs"
                @click="handleNext"
              >
                {{ t('tutorial.controls.next') }} →
              </button>
              <span v-else class="text-xs text-base-content/40 italic">{{
                t('tutorial.controls.waiting')
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<style>
/* Static dim so only the ring pulses, not the backdrop. */
.spotlight-pulse {
  box-shadow: 0 0 0 9999px color-mix(in srgb, var(--color-scrim) 18%, transparent);
}
.spotlight-pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow:
    0 0 0 4px var(--color-secondary),
    0 0 12px 2px color-mix(in srgb, var(--color-secondary) 60%, transparent);
  animation: spotlight-pulse 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes spotlight-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.06);
  }
}
</style>
