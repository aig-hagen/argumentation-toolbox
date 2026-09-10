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

import { TUTORIAL_REFIT_KEY } from '@/modules/common/graph-editor/graphEditor'
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
  refitBelowCard?.(null)
  if (activeOwnerId.value === instanceId) {
    skipTutorial()
  }
})

// Keep the graph clear of the docked card: re-fit the graph into the band below the card when the
// tutorial opens and when entering a `refitOnEnter` step (e.g. after the eval sheet is compacted),
// and restore the full fit when it closes.
const cardRef = useTemplateRef<HTMLElement>('tutorialCard')
const refitBelowCard = inject(TUTORIAL_REFIT_KEY, null)

async function refitToVisibleBand() {
  if (!refitBelowCard) return
  await nextTick()
  const bottom = cardRef.value?.getBoundingClientRect().bottom ?? 0
  if (bottom > 0) refitBelowCard(bottom)
}

watch(
  () => (isActive.value && isOwner.value ? activeStepIndex.value : -1),
  (index, previous) => {
    if (!refitBelowCard) return
    if (index === -1) {
      refitBelowCard(null)
      return
    }
    if (previous === -1 || currentStep.value?.refitOnEnter) refitToVisibleBand()
  },
  { immediate: true },
)

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
  const next = tutorials.find((t) => t.id === currentStep.value!.nextTutorialId) ?? null
  if (next?.desktopOnly && isTouchDevice) return null
  return next
})

// Spotlight: a ring drawn over the step's highlighted or anchored control.
// `highlight` takes priority (spotlight-only, no card movement on desktop either).
const spotlightRef = computed<HTMLElement | null>(() => {
  if (!currentStep.value) return null
  const h = currentStep.value.highlight
  if (h) {
    const key = typeof h === 'function' ? h(isTouchDevice) : h
    if (key) return refs[key] ?? null
  }
  if (currentStep.value.anchor) return refs[currentStep.value.anchor] ?? null
  return null
})
// The spotlit control may live inside the draggable evaluation sheet, which moves via JS
// transforms (no scroll/resize event), so measure its rect directly each frame while a spotlight
// is shown — keeping the ring glued to it from the first frame and as the sheet snaps detents.
const spX = ref(0)
const spY = ref(0)
const spW = ref(0)
const spH = ref(0)
const hasSpotlight = computed(() => spW.value > 0)
let spotlightRaf: number | null = null
function trackSpotlight() {
  const el = spotlightRef.value
  if (el) {
    const r = el.getBoundingClientRect()
    spX.value = r.x
    spY.value = r.y
    spW.value = r.width
    spH.value = r.height
  } else {
    spW.value = 0
  }
  spotlightRaf = requestAnimationFrame(trackSpotlight)
}
watch(
  () => spotlightRef.value !== null,
  (present) => {
    if (present && spotlightRaf === null) trackSpotlight()
    else if (!present && spotlightRaf !== null) {
      cancelAnimationFrame(spotlightRaf)
      spotlightRaf = null
      spW.value = 0
    }
  },
  { immediate: true },
)
onUnmounted(() => {
  if (spotlightRaf !== null) cancelAnimationFrame(spotlightRaf)
})
const spotlightStyle = computed(() => ({
  left: `${spX.value}px`,
  top: `${spY.value}px`,
  width: `${spW.value}px`,
  height: `${spH.value}px`,
}))

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
</script>

<template>
  <template v-if="isOwner && isActive && currentStep">
    <!-- Spotlight ring over the anchored target (fixed to the viewport rect). -->
    <div
      v-if="hasSpotlight"
      class="fixed z-1100 pointer-events-none rounded-2xl spotlight-pulse"
      :style="spotlightStyle"
    ></div>

    <!-- Docked card below the top bar; the canvas stays live underneath. -->
    <div
      ref="tutorialCard"
      class="absolute inset-x-2 z-30 pointer-events-auto"
      style="top: calc(env(safe-area-inset-top) + 3.75rem)"
    >
      <div
        class="rounded-2xl bg-base-100 border border-primary/20 shadow-xl shadow-primary/10 p-3.5"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-semibold text-base-content/60 shrink-0">
            Step {{ activeStepIndex + 1 }} of {{ stepCount }}
          </span>
          <progress
            class="progress progress-primary flex-1 h-1.5"
            :value="activeStepIndex + 1"
            :max="stepCount"
          ></progress>
          <button
            class="btn btn-ghost btn-xs btn-square"
            :aria-label="t('tutorial.controls.skipTutorial')"
            @click="skipTutorial"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-4"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <h3 class="text-[15px] font-semibold mb-1">{{ currentStep.title }}</h3>
        <div class="text-[13px] text-base-content/80 leading-relaxed">
          <template v-for="(part, i) in bodyParts" :key="i">
            <TermTooltip v-if="typeof part === 'object'" :id="part.tooltipId">{{
              part.text
            }}</TermTooltip>
            <span v-else class="contents" v-html="part"></span>
          </template>
        </div>
        <div class="flex items-center justify-between gap-2 mt-3">
          <button
            v-if="activeStepIndex > 0"
            class="btn btn-ghost btn-sm gap-1 text-base-content/70"
            @click="handlePrev"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-4"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
            {{ t('tutorial.controls.back') }}
          </button>
          <div v-else class="flex-0"></div>
          <div class="flex items-center gap-2">
            <template v-if="isLastStep">
              <button
                v-if="nextTutorial"
                class="btn btn-soft btn-secondary btn-sm"
                @click="handleStartNext"
              >
                ▶ {{ nextTutorial.name }}
              </button>
              <button class="btn btn-primary btn-sm" @click="handleDone">
                {{ t('tutorial.controls.done') }}
              </button>
            </template>
            <button
              v-else-if="resolvedAdvanceOn === 'button'"
              class="btn btn-primary btn-sm gap-1"
              @click="handleNext"
            >
              {{ t('tutorial.controls.next') }}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="size-4"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <span
              v-else
              class="flex items-center gap-2 text-[13px] font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full"
            >
              <span class="size-2 rounded-full bg-primary animate-pulse"></span>
              {{ t('tutorial.controls.waiting') }}
            </span>
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
