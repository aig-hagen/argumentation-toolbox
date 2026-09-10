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
import { AdjustmentsHorizontalIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline'
import { createReusableTemplate } from '@vueuse/core'
import { computed, onMounted, provide, ref, shallowRef, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { SerialisationWindowInstanceState } from '@/modules/abstract-argumentation/evaluation/serialisationWindowState'
import {
  fetchIsTerminal,
  fetchSelection,
  SELECTION_FUNCTIONS,
  type SerialisationFunction,
  TERMINATION_FUNCTIONS,
  useSerialisationEvaluationQuery,
} from '@/modules/abstract-argumentation/evaluation/tweetyProjectSerialisation'
import { abstractArgumentationGlossary } from '@/modules/abstract-argumentation/glossary'
import { AbstractArgumentation } from '@/modules/abstract-argumentation/model'
import type { ArgumentData, ArgumentId } from '@/modules/common/argumentation/model'
import { NODE_GREEN, NODE_RED } from '@/modules/common/colors'
import type { DocumentId } from '@/modules/common/documents/db'
import type { Input } from '@/modules/common/evaluation/types'
import ParameterField from '@/modules/common/forms/ParameterField.vue'
import type { Highlight } from '@/modules/common/graph-editor/graphEditor'
import { IdMapping } from '@/modules/common/ids'
import TermDefinitionBlock from '@/modules/common/tooltip/TermDefinitionBlock.vue'
import { TOOLTIP_REGISTRY_KEY } from '@/modules/common/tooltip/tooltipRegistry'
import WindowShell from '@/modules/common/window/WindowShell.vue'

const {
  input,
  instanceState,
  instanceOffset = 0,
  documentId,
  stateKey,
  suppressed = false,
  hosted = false,
} = defineProps<{
  input: Input<AbstractArgumentation<ArgumentData>>
  instanceState: SerialisationWindowInstanceState
  instanceOffset?: number
  documentId?: DocumentId
  stateKey?: string
  suppressed?: boolean
  hosted?: boolean
}>()

// Body defined once, rendered either inside WindowShell (desktop) or bare in the
// compact evaluation host.
const [DefineBody, ReuseBody] = createReusableTemplate()

const emit = defineEmits<{
  'update:instanceState': [state: SerialisationWindowInstanceState]
  highlight: [highlight?: Highlight]
  title: [title: string]
  close: []
  focus: []
}>()

provide(TOOLTIP_REGISTRY_KEY, abstractArgumentationGlossary)

const { t } = useI18n({ useScope: 'global' })

function resolveFunction(fns: SerialisationFunction[], key: string): SerialisationFunction {
  return fns.find((f) => f.key === key) ?? fns[0]!
}

// --- Persistent window state ---
const selectedSelectionFunction = shallowRef<SerialisationFunction>(
  resolveFunction(SELECTION_FUNCTIONS, instanceState.selectionFunctionKey),
)
const selectedTerminationFunction = shallowRef<SerialisationFunction>(
  resolveFunction(TERMINATION_FUNCTIONS, instanceState.terminationFunctionKey),
)
const selectedMode = ref<'sequences' | 'interactive'>(instanceState.mode ?? 'sequences')

watch([selectedSelectionFunction, selectedTerminationFunction, selectedMode], () => {
  const state: SerialisationWindowInstanceState = {
    id: instanceState.id,
    selectionFunctionKey: selectedSelectionFunction.value.key,
    terminationFunctionKey: selectedTerminationFunction.value.key,
    mode: selectedMode.value,
  }
  emit('update:instanceState', state)
})

// --- FloatingWindow state ---
const isOpen = ref(true)
watch(isOpen, (v) => {
  if (!v) emit('close')
})
// In the compact host the sheet is short, so params start collapsed to a summary header.
const paramsOpen = ref(!hosted)

const windowTitle = computed(() => {
  const sel = selectedSelectionFunction.value.displayName
  const term = selectedTerminationFunction.value.displayName
  const modeLabel =
    selectedMode.value === 'interactive'
      ? t('evaluation.serialisation.modeInteractive')
      : t('evaluation.serialisation.modeSequences')
  return `${sel} · ${term} · ${modeLabel}`
})

// The compact host labels its switcher pill with this title (not the raw key).
watch(windowTitle, (t) => emit('title', t), { immediate: true })

// ──────────────────────────────────────────────────────────────
// SEQUENCES MODE
// ──────────────────────────────────────────────────────────────
const sequencesEnabled = computed(() => selectedMode.value === 'sequences')
const query = useSerialisationEvaluationQuery(
  toRef(() => input),
  computed(() => selectedSelectionFunction.value.key),
  computed(() => selectedTerminationFunction.value.key),
  sequencesEnabled,
)
const { error, isLoading, isError, refetch, data } = query
const isTimeout = computed(() => error.value?.name === 'EvaluationTimeoutError')

// ──────────────────────────────────────────────────────────────
// INTERACTIVE MODE
// ──────────────────────────────────────────────────────────────

interface ReductState {
  numberOfArgs: number
  attacks: [number, number][]
  /** originalIds[i] = original server ID (1-indexed) of reduct argument i+1 */
  originalIds: number[]
}

// Current reduct (built from original AF reduced by extension so far)
const reductState = ref<ReductState | null>(null)
// Extension accumulated so far, as original server IDs
const currentExtension = ref<number[]>([])
// Steps the user has picked, for display (named args)
const builtSequence = ref<{ id: ArgumentId; name: string }[][]>([])
// Selectable sets returned by get_selection, in reduct IDs
const selectableStepsRaw = ref<number[][]>([])
// Terminal status from is_terminal
const interactiveIsTerminal = ref<boolean | null>(null)
const interactiveIsLoading = ref(false)
const interactiveError = ref<Error | null>(null)

// Maps original server ID → {id, name}
const argumentIdAndData = computed(() => [...input.content.arguments()])
function getArgByServerId(originalServerId: number): { id: ArgumentId; name: string } {
  const entry = argumentIdAndData.value[originalServerId - 1]
  if (!entry) throw new Error('Invalid server argument ID')
  const [id, { name }] = entry
  return { id, name }
}
function mapReductStep(
  reductStep: number[],
  state: ReductState,
): { id: ArgumentId; name: string }[] {
  return reductStep.map((reductId) => getArgByServerId(state.originalIds[reductId - 1]!))
}

// Named args for each selectable step (for display/buttons)
const selectableStepsDisplay = computed(() =>
  reductState.value
    ? selectableStepsRaw.value.map((step) => mapReductStep(step, reductState.value!))
    : [],
)

function buildOriginalAFFromInput(): { numberOfArgs: number; attacks: [number, number][] } {
  const content = input.content
  let n = 0
  const idMapping = new IdMapping<ArgumentId, number>()
  for (const [id] of content.arguments()) {
    idMapping.add(id, ++n)
  }
  const attacks: [number, number][] = []
  for (const [src, tgt] of content.attacks()) {
    attacks.push([idMapping.getOrFail(src), idMapping.getOrFail(tgt)])
  }
  return { numberOfArgs: n, attacks }
}

function computeReduct(state: ReductState, selectedSet: number[]): ReductState {
  const S = new Set(selectedSet)
  const attacked = new Set<number>()
  for (const pair of state.attacks) {
    if (S.has(pair[0])) attacked.add(pair[1])
  }
  const removed = new Set([...S, ...attacked])
  const remaining: number[] = []
  for (let i = 1; i <= state.numberOfArgs; i++) {
    if (!removed.has(i)) remaining.push(i)
  }
  const reindex = new Map(remaining.map((id, idx) => [id, idx + 1]))
  const newAttacks: [number, number][] = state.attacks
    .filter((pair) => !removed.has(pair[0]) && !removed.has(pair[1]))
    .map((pair) => [reindex.get(pair[0])!, reindex.get(pair[1])!] as [number, number])
  return {
    numberOfArgs: remaining.length,
    attacks: newAttacks,
    originalIds: remaining.map((id) => state.originalIds[id - 1]!),
  }
}

async function fetchInteractiveStep() {
  if (!reductState.value) return
  interactiveIsLoading.value = true
  interactiveError.value = null
  try {
    const [selectionResult, terminalResult] = await Promise.all([
      fetchSelection(
        reductState.value.numberOfArgs,
        reductState.value.attacks,
        selectedSelectionFunction.value.key,
      ),
      fetchIsTerminal(
        reductState.value.numberOfArgs,
        reductState.value.attacks,
        currentExtension.value,
        selectedTerminationFunction.value.key,
      ),
    ])
    selectableStepsRaw.value = selectionResult.steps
    interactiveIsTerminal.value = terminalResult.terminal
  } catch (e) {
    interactiveError.value = e instanceof Error ? e : new Error(String(e))
  } finally {
    interactiveIsLoading.value = false
  }
}

function resetInteractive() {
  const af = buildOriginalAFFromInput()
  reductState.value = {
    numberOfArgs: af.numberOfArgs,
    attacks: af.attacks,
    originalIds: Array.from({ length: af.numberOfArgs }, (_, i) => i + 1),
  }
  currentExtension.value = []
  builtSequence.value = []
  selectableStepsRaw.value = []
  interactiveIsTerminal.value = null
  interactiveError.value = null
  fetchInteractiveStep()
}

function pickStep(stepIndex: number) {
  const raw = selectableStepsRaw.value[stepIndex]
  if (!raw || !reductState.value) return
  builtSequence.value = [...builtSequence.value, mapReductStep(raw, reductState.value)]
  const originalIds = raw.map((reductId) => reductState.value!.originalIds[reductId - 1]!)
  currentExtension.value = [...currentExtension.value, ...originalIds]
  reductState.value = computeReduct(reductState.value, raw)
  fetchInteractiveStep()
}

// Start interactive session when switching to that mode or on mount
watch(selectedMode, (newMode) => {
  if (newMode === 'interactive') resetInteractive()
})
// Reset when the AF changes while in interactive mode
watch(
  () => input.stateId,
  () => {
    if (selectedMode.value === 'interactive') resetInteractive()
  },
)
// Reset on function change in interactive mode
watch([selectedSelectionFunction, selectedTerminationFunction], () => {
  if (selectedMode.value === 'interactive' && reductState.value !== null) resetInteractive()
})

onMounted(() => {
  if (selectedMode.value === 'interactive') resetInteractive()
})

const currentHighlight = computed<Highlight | undefined>(() => {
  if (selectedMode.value !== 'interactive' || currentExtension.value.length === 0) return undefined
  const nodes = new Set(
    currentExtension.value.map((serverId) => {
      const entry = argumentIdAndData.value[serverId - 1]
      if (!entry) throw new Error('Invalid server argument ID')
      return entry[0]
    }),
  )
  return {
    stateId: input.stateId,
    groups: [{ nodes, color: NODE_GREEN }],
    attackedByFirst: NODE_RED,
  }
})

const emittedHighlight = computed(() => (suppressed ? undefined : currentHighlight.value))
const isActive = computed(() => !suppressed && currentHighlight.value !== undefined)

watch(emittedHighlight, (h) => emit('highlight', h))
function onWindowFocus() {
  emit('focus')
}
</script>

<template>
  <DefineBody>
    <div class="px-3 pb-3 pt-1 flex flex-col gap-2.5 text-xs">
      <!-- Compact host: a summary header so the config stays visible while params collapse. -->
      <button
        v-if="hosted"
        type="button"
        class="flex items-center gap-2 rounded-field bg-base-200/60 border border-base-300 px-2.5 py-2 text-left"
        :aria-expanded="paramsOpen"
        @click="paramsOpen = !paramsOpen"
      >
        <AdjustmentsHorizontalIcon class="size-4 shrink-0 opacity-70" />
        <span class="flex-1 min-w-0 truncate font-medium">{{ windowTitle }}</span>
        <span class="text-[0.65rem] opacity-60">{{
          paramsOpen ? t('evaluation.status.hideParams') : t('evaluation.status.editParams')
        }}</span>
      </button>

      <div
        v-show="paramsOpen"
        class="rounded-field bg-base-200/60 border border-base-300 p-2.5 flex flex-col gap-2"
      >
        <div class="flex flex-wrap gap-3">
          <ParameterField :label="t('evaluation.fields.selection')" min-width="9rem">
            <select v-model="selectedSelectionFunction" class="select select-sm w-full bg-base-200">
              <option v-for="fn in SELECTION_FUNCTIONS" :key="fn.key" :value="fn">
                {{ fn.displayName }}
              </option>
            </select>
          </ParameterField>
          <ParameterField :label="t('evaluation.fields.termination')" min-width="9rem">
            <select
              v-model="selectedTerminationFunction"
              class="select select-sm w-full bg-base-200"
            >
              <option v-for="fn in TERMINATION_FUNCTIONS" :key="fn.key" :value="fn">
                {{ fn.displayName }}
              </option>
            </select>
          </ParameterField>
          <ParameterField :label="t('evaluation.fields.mode')" max-width="8rem">
            <select v-model="selectedMode" class="select select-sm w-full bg-base-200">
              <option value="sequences">{{ t('evaluation.serialisation.modeSequences') }}</option>
              <option value="interactive">
                {{ t('evaluation.serialisation.modeInteractive') }}
              </option>
            </select>
          </ParameterField>
        </div>
        <TermDefinitionBlock :id="selectedSelectionFunction.tooltipId" />
        <TermDefinitionBlock :id="selectedTerminationFunction.tooltipId" />
      </div>

      <!-- ── SEQUENCES RESULTS ── -->
      <template v-if="selectedMode === 'sequences'">
        <div
          v-if="isError"
          role="alert"
          class="alert alert-soft py-1.5"
          :class="isTimeout ? 'alert-warning' : 'alert-error'"
        >
          <span>{{
            isTimeout ? t('evaluation.serialisation.timedOut') : t('evaluation.status.failed')
          }}</span>
          <button class="btn btn-xs btn-ghost ml-auto" @click="() => refetch()">
            {{ t('evaluation.status.retry') }}
          </button>
        </div>
        <template v-if="data !== undefined">
          <div v-if="data.sequences.length === 0" class="text-sm opacity-60">
            {{ t('evaluation.serialisation.noSequences') }}
          </div>
          <ol v-else class="flex flex-col gap-2">
            <li
              v-for="(sequence, seqIndex) in data.sequences"
              :key="seqIndex"
              class="flex flex-wrap items-center gap-1 text-sm"
            >
              <template v-for="(step, stepIndex) in sequence" :key="stepIndex">
                <span v-if="stepIndex > 0" class="select-none opacity-50">&#x2192;</span>
                <span class="rounded border px-1.5 py-0.5 font-mono">
                  <template v-if="step.length === 0">&#x2205;</template>
                  <template v-else>{{ step.map((a) => a.name).join(', ') }}</template>
                </span>
              </template>
            </li>
          </ol>
          <p class="label">
            {{ data.evaluationDurationInMs }}ms · {{ data.sequences.length }}
            {{ t('evaluation.serialisation.sequenceCount', data.sequences.length) }}
          </p>
        </template>
        <p v-if="isLoading" class="text-base-content/50">{{ t('evaluation.status.evaluating') }}</p>
      </template>

      <!-- ── INTERACTIVE RESULTS ── -->
      <template v-if="selectedMode === 'interactive'">
        <div v-if="interactiveError" role="alert" class="alert alert-error alert-soft py-1.5">
          <span>{{ t('evaluation.status.failed') }}</span>
          <button class="btn btn-xs btn-ghost ml-auto" @click="fetchInteractiveStep()">
            {{ t('evaluation.status.retry') }}
          </button>
        </div>

        <template v-else>
          <!-- Built sequence so far -->
          <div v-if="builtSequence.length > 0" class="flex flex-wrap items-center gap-1 text-sm">
            <template v-for="(step, i) in builtSequence" :key="i">
              <span v-if="i > 0" class="select-none opacity-50">&#x2192;</span>
              <span class="rounded border px-1.5 py-0.5 font-mono">
                <template v-if="step.length === 0">&#x2205;</template>
                <template v-else>{{ step.map((a) => a.name).join(', ') }}</template>
              </span>
            </template>
          </div>

          <!-- Terminal status -->
          <div v-if="interactiveIsTerminal !== null" class="flex items-center gap-1.5 text-sm">
            <CheckCircleIcon v-if="interactiveIsTerminal" class="size-4 text-success" />
            <XCircleIcon v-else class="size-4 text-error" />
            <span>{{
              interactiveIsTerminal
                ? t('evaluation.serialisation.terminal')
                : t('evaluation.serialisation.notTerminal')
            }}</span>
          </div>

          <!-- Step selection -->
          <div
            v-if="selectableStepsDisplay.length === 0 && !interactiveIsLoading"
            class="text-sm opacity-60"
          >
            {{ t('evaluation.serialisation.noInitialSets') }}
          </div>
          <div v-else-if="selectableStepsDisplay.length > 0" class="flex flex-col gap-1.5">
            <p class="opacity-60">{{ t('evaluation.serialisation.selectNextInitialSet') }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(step, i) in selectableStepsDisplay"
                :key="i"
                class="btn btn-sm btn-outline font-mono"
                @click="pickStep(i)"
              >
                <template v-if="step.length === 0">&#x2205;</template>
                <template v-else>{{ '{' + step.map((a) => a.name).join(', ') + '}' }}</template>
              </button>
            </div>
          </div>
          <p v-if="interactiveIsLoading" class="text-base-content/50">
            {{ t('evaluation.status.evaluating') }}
          </p>
        </template>

        <div class="flex">
          <button class="btn btn-xs btn-soft" @click="resetInteractive()">
            {{ t('common.actions.reset') }}
          </button>
        </div>
      </template>
    </div>
  </DefineBody>

  <ReuseBody v-if="hosted" />
  <WindowShell
    v-else
    v-model:open="isOpen"
    v-model:params-open="paramsOpen"
    card
    :title="windowTitle"
    :loading="selectedMode === 'sequences' ? isLoading : interactiveIsLoading"
    :initial-position="{ x: 256 + instanceOffset * 24, y: 96 + instanceOffset * 24 }"
    :intital-size="{ width: 576, height: 480 }"
    :instance-offset="instanceOffset"
    :document-id="documentId"
    :state-key="stateKey"
    :active="isActive"
    :minimizable="false"
    @focus="onWindowFocus"
  >
    <ReuseBody />
  </WindowShell>
</template>
