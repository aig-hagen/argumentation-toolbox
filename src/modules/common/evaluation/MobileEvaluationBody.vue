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
import { computed, inject, onUnmounted, provide, type Ref, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { EvaluationWindowQuery } from '@/modules/common/evaluation/BaseEvaluationWindow.vue'
import {
  EVALUATION_DETENT_KEY,
  EVALUATION_STICKY_FOOTER_KEY,
  type EvaluationDetentLayout,
} from '@/modules/common/evaluation/hostContext'
import { TWEETY_TIMEOUT_IN_MS } from '@/modules/common/evaluation/tweety-project/fetch'

// Mobile-only evaluation body for the compact host sheet. Kept separate from the
// desktop EvaluationCard so the detent-driven layout can diverge without regressing
// the floating windows. The active detent folds the selector row / glossary away:
// compact = results + copy footer only; standard / full also show the parameters.
const { query } = defineProps<{ query: EvaluationWindowQuery }>()

const emit = defineEmits<{ evaluate: [] }>()

const { t } = useI18n({ useScope: 'global' })

const detent = inject<Ref<EvaluationDetentLayout>>(
  EVALUATION_DETENT_KEY,
  ref<EvaluationDetentLayout>('standard'),
)
const showParams = computed(() => detent.value !== 'compact')

// Let the shared result grid pin its status/copy line to the sheet bottom.
provide(EVALUATION_STICKY_FOOTER_KEY, true)

const { error, isPending, isLoading, isError, refetch } = query

watch(isLoading, (loading, wasLoading) => {
  if (loading && !wasLoading) emit('evaluate')
})

const statusStrip = computed(() => {
  if (!isError.value) return undefined
  switch (error.value?.name) {
    case 'ServiceUnavailableError':
      return { kind: 'warning', message: t('evaluation.status.serviceUnavailable') }
    case 'RateLimitError':
      return { kind: 'warning', message: t('evaluation.status.rateLimited') }
    case 'EvaluationTimeoutError':
      return { kind: 'warning', message: t('evaluation.status.timedOut', { seconds: TIMEOUT_S }) }
    default:
      return { kind: 'error', message: t('evaluation.status.failed') }
  }
})

// True only on the very first evaluation, before any result exists.
const isInitialLoad = computed(() => isLoading.value && isPending.value)

const TIMEOUT_S = Math.round(TWEETY_TIMEOUT_IN_MS / 1000)
const remainingSeconds = ref(TIMEOUT_S)
let countdownInterval: ReturnType<typeof setInterval> | null = null

watch(isLoading, (loading) => {
  if (loading) {
    remainingSeconds.value = TIMEOUT_S
    countdownInterval = setInterval(() => {
      remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)
    }, 1000)
  } else if (countdownInterval !== null) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
})

onUnmounted(() => {
  if (countdownInterval !== null) clearInterval(countdownInterval)
})
</script>

<template>
  <!-- No bottom padding: the sticky results footer must reach the sheet's bottom edge
       (padding below it would leave the bar floating up when results are short or fully
       scrolled). Spacing above the footer comes from the flex gap. -->
  <div class="flex-1 min-h-0 px-3 pt-1 flex flex-col gap-2.5 text-xs">
    <!-- Selector row + glossary: folded away at the compact detent (the header pill
         already names the active config); shown at standard / full. The glossary
         renders its own themed card (TermDefinitionBlock), so it sits outside the
         bare selector row. -->
    <div v-show="showParams" class="flex flex-wrap gap-3">
      <slot name="parameters" />
    </div>
    <div v-show="showParams">
      <slot name="parameters-footer" />
    </div>

    <div
      v-if="statusStrip"
      role="alert"
      class="alert alert-soft py-1.5"
      :class="statusStrip.kind === 'error' ? 'alert-error' : 'alert-warning'"
    >
      <span>{{ statusStrip.message }}</span>
      <button class="btn btn-xs btn-ghost ml-auto" @click="() => refetch()">
        {{ t('evaluation.status.retry') }}
      </button>
    </div>

    <div v-if="isInitialLoad" aria-hidden="true" class="flex flex-wrap gap-2">
      <span class="skeleton h-6 w-24 rounded-full"></span>
      <span class="skeleton h-6 w-16 rounded-full"></span>
    </div>

    <slot v-if="!isPending || isLoading" name="results" />

    <p v-if="isLoading" class="text-base-content/50">
      {{ t('evaluation.status.evaluatingCountdown', { seconds: remainingSeconds }) }}
    </p>
  </div>
</template>
