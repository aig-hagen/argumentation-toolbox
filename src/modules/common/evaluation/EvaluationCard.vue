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
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { EvaluationWindowQuery } from '@/modules/common/evaluation/BaseEvaluationWindow.vue'
import { TWEETY_TIMEOUT_IN_MS } from '@/modules/common/evaluation/tweety-project/fetch'

const { t } = useI18n({ useScope: 'global' })

// The inner body of an evaluation window/sheet: parameters, status strip, and results.
// Extracted from BaseEvaluationWindow so it can render either inside a FloatingWindow /
// BottomSheet (desktop) or bare inside the compact evaluation host.
const {
  query,
  hosted = false,
  title = '',
} = defineProps<{
  query: EvaluationWindowQuery
  /** In the compact host, show a semantics·mode header with a params toggle. */
  hosted?: boolean
  title?: string
}>()

const emit = defineEmits<{ evaluate: [] }>()

const paramsOpen = defineModel<boolean>('paramsOpen', { default: true })

const { error, isPending, isLoading, isError, refetch } = query

watch(isLoading, (loading, wasLoading) => {
  if (loading && !wasLoading) emit('evaluate')
})

// All failure modes share one status strip; only wording and tone differ.
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

// True only on the very first evaluation, before any result exists — the slot
// where skeleton chips render. Re-evaluations keep the previous results visible.
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
  } else {
    if (countdownInterval !== null) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
  }
})

onUnmounted(() => {
  if (countdownInterval !== null) clearInterval(countdownInterval)
})
</script>

<template>
  <div class="px-3 pb-3 pt-1 flex flex-col gap-2.5 text-xs">
    <!-- Compact host: a summary header so the semantics·mode stays visible while the
         parameter editor is collapsed, keeping results in view at the peek height. -->
    <button
      v-if="hosted"
      type="button"
      class="flex items-center gap-2 rounded-field bg-base-200/60 border border-base-300 px-2.5 py-2 text-left"
      :aria-expanded="paramsOpen"
      @click="paramsOpen = !paramsOpen"
    >
      <AdjustmentsHorizontalIcon class="size-4 shrink-0 opacity-70" />
      <span class="flex-1 min-w-0 truncate font-medium">{{ title }}</span>
      <span class="text-[0.65rem] opacity-60">{{
        paramsOpen ? t('evaluation.status.hideParams') : t('evaluation.status.editParams')
      }}</span>
    </button>

    <div
      v-show="paramsOpen"
      class="rounded-field bg-base-200/60 border border-base-300 p-2.5 flex flex-col gap-2"
    >
      <div class="flex flex-wrap gap-3">
        <slot name="parameters" />
      </div>
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
