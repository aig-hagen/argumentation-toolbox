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
import { computed, provide, ref, shallowRef, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { RankingWindowInstanceState } from '@/modules/abstract-argumentation/evaluation/rankingWindowState'
import {
  defaultRankingArgsFor,
  KNOWN_RANKING_SEMANTICS,
  type RankingArgs,
  type RankingSemantic,
  useRankingEvaluationQuery,
} from '@/modules/abstract-argumentation/evaluation/tweetyProjectRanking'
import {
  abstractArgumentationGlossary,
  abstractArgumentationRankingGlossary,
} from '@/modules/abstract-argumentation/glossary'
import { AbstractArgumentation } from '@/modules/abstract-argumentation/model'
import type { ArgumentData, ArgumentId } from '@/modules/common/argumentation/model'
import type { DocumentId } from '@/modules/common/documents/db'
import BaseEvaluationWindow from '@/modules/common/evaluation/BaseEvaluationWindow.vue'
import EvaluationStatusFooter from '@/modules/common/evaluation/EvaluationStatusFooter.vue'
import type { Input } from '@/modules/common/evaluation/types'
import { escapeTexText } from '@/modules/common/export/texEscape'
import GroupedSelect from '@/modules/common/forms/GroupedSelect.vue'
import ParameterField from '@/modules/common/forms/ParameterField.vue'
import PickerSelect from '@/modules/common/forms/PickerSelect.vue'
import TermDefinitionBlock from '@/modules/common/tooltip/TermDefinitionBlock.vue'
import { TOOLTIP_REGISTRY_KEY } from '@/modules/common/tooltip/tooltipRegistry'

provide(TOOLTIP_REGISTRY_KEY, {
  ...abstractArgumentationGlossary,
  ...abstractArgumentationRankingGlossary,
})

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
  instanceState: RankingWindowInstanceState
  instanceOffset?: number
  documentId?: DocumentId
  stateKey?: string
  suppressed?: boolean
  hosted?: boolean
}>()

const emit = defineEmits<{
  'update:instanceState': [state: RankingWindowInstanceState]
  setWeights: [weights: Array<{ id: ArgumentId; weight: number }>]
  title: [title: string]
  close: []
  focus: []
}>()

const { t } = useI18n({ useScope: 'global' })

function resolveSemanticFromKey(key: string): RankingSemantic {
  return KNOWN_RANKING_SEMANTICS.find((s) => s.key === key) ?? KNOWN_RANKING_SEMANTICS[0]!
}

const selectedSemantic = shallowRef<RankingSemantic>(
  resolveSemanticFromKey(instanceState.semanticKey),
)
const args = ref<RankingArgs>(
  instanceState.args ?? defaultRankingArgsFor(instanceState.semanticKey),
)

watch(selectedSemantic, (semantic, previous) => {
  if (previous !== undefined && semantic.key !== previous.key) {
    args.value = defaultRankingArgsFor(semantic.key)
  }
})

watch(
  [selectedSemantic, args],
  () => {
    emit('update:instanceState', {
      id: instanceState.id,
      semanticKey: selectedSemantic.value.key,
      args: args.value,
    })
  },
  { deep: true },
)

const windowTitle = computed(
  () => `${selectedSemantic.value.displayName} · ${t('evaluation.ranking.modeLabel')}`,
)

// The compact host labels its switcher pill with this title (not the raw key).
watch(windowTitle, (t) => emit('title', t), { immediate: true })

const query = useRankingEvaluationQuery(
  toRef(() => input),
  computed(() => selectedSemantic.value.key),
  args,
  true,
)

const { data } = query

const rankGroups = computed(() => {
  if (data.value === undefined || data.value.rankingType !== 'lattice') return undefined
  const byScore = new Map<number, typeof data.value.ranking>()
  for (const entry of data.value.ranking) {
    const group = byScore.get(entry.score)
    if (group) group.push(entry)
    else byScore.set(entry.score, [entry])
  }
  return [...byScore.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, entries]) => ({
      entries: [...entries].sort((a, b) => a.name.localeCompare(b.name)),
    }))
})

const numericalDisplayData = computed(() => {
  if (data.value === undefined || data.value.rankingType !== 'numerical') return undefined
  const scores = data.value.ranking.map((e) => e.score)
  const minScore = Math.min(...scores)
  const maxScore = Math.max(...scores)
  const range = maxScore - minScore
  return data.value.ranking.map((entry) => {
    const t = range === 0 ? 0.5 : (entry.score - minScore) / range
    const hue = Math.round(30 + t * 90)
    return {
      ...entry,
      bgColor: `hsl(${hue}, 55%, 90%)`,
      borderColor: `hsl(${hue}, 55%, 62%)`,
      // Fixed-dark, hue-matched text: the chip background is light in both themes.
      textColor: `hsl(${hue}, 45%, 22%)`,
    }
  })
})

function formatScore(score: number): string {
  if (Number.isInteger(score)) return String(score)
  return String(parseFloat(score.toPrecision(4)))
}

const copyText = computed(() => {
  if (rankGroups.value !== undefined) {
    return rankGroups.value.map((group) => group.entries.map((e) => e.name).join(', ')).join(' ≻ ')
  }
  if (numericalDisplayData.value !== undefined) {
    return numericalDisplayData.value.map((e) => `${e.name}: ${formatScore(e.score)}`).join('\n')
  }
  return undefined
})

const copyTextTex = computed(() => {
  if (rankGroups.value !== undefined) {
    return rankGroups.value
      .map((group) => group.entries.map((e) => escapeTexText(e.name)).join(', '))
      .join(' \\succ ')
  }
  if (numericalDisplayData.value !== undefined) {
    return numericalDisplayData.value
      .map((e) => `${escapeTexText(e.name)}: ${formatScore(e.score)}`)
      .join('\n')
  }
  return undefined
})

const statusLine = computed(() => {
  if (data.value === undefined) return undefined
  const hint =
    data.value.rankingType === 'lattice'
      ? t('evaluation.ranking.levelHint')
      : t('evaluation.ranking.scoreHint')
  return `${data.value.evaluationDurationInMs}ms · ${hint}`
})

function computeWeights() {
  const d = data.value
  return d === undefined
    ? []
    : d.ranking.map((e) => ({
        id: e.id,
        weight: d.rankingType === 'lattice' ? Math.round(e.score) : e.score,
      }))
}

// Suppressed instances (all but the active one in the compact host, and unfocused
// windows on desktop) own no node weights, so switching config swaps the badges.
const emittedWeights = computed(() => (suppressed ? [] : computeWeights()))
watch(emittedWeights, (w) => emit('setWeights', w), { immediate: true })

function onWindowFocus() {
  emit('focus')
}

const isActive = computed(() => !suppressed && data.value !== undefined)
</script>

<template>
  <BaseEvaluationWindow
    :title="windowTitle"
    :hosted="hosted"
    :instance-offset="instanceOffset"
    :initial-position-base="{ x: 192, y: 96 }"
    :initial-size="{ width: 480, height: 400 }"
    :query="query"
    :document-id="documentId"
    :state-key="stateKey"
    :active="isActive"
    @close="emit('close')"
    @focus="onWindowFocus"
  >
    <template #parameters>
      <ParameterField :label="t('evaluation.fields.semantics')" min-width="10rem">
        <GroupedSelect
          v-model="selectedSemantic"
          :groups="[{ key: 'ranking', displayName: '', options: KNOWN_RANKING_SEMANTICS }]"
          full-width
        />
      </ParameterField>
      <ParameterField
        v-for="param in selectedSemantic.parameters ?? []"
        :key="param.key"
        :label="param.label"
        :title="param.description"
        max-width="10rem"
      >
        <input
          v-if="param.type === 'number'"
          type="number"
          class="input input-sm w-full bg-base-200"
          :min="param.min"
          :max="param.max"
          :step="param.step ?? 'any'"
          v-model.number="args[param.key]"
        />
        <input
          v-else-if="param.type === 'boolean'"
          type="checkbox"
          class="toggle toggle-sm"
          v-model="args[param.key]"
        />
        <PickerSelect
          v-else
          :model-value="args[param.key] as string"
          :options="param.options ?? []"
          @update:model-value="args[param.key] = $event"
        />
      </ParameterField>
    </template>
    <template #parameters-footer>
      <TermDefinitionBlock :id="selectedSemantic.key" />
    </template>
    <template #results>
      <template v-if="data !== undefined">
        <template v-if="data.rankingType === 'lattice'">
          <div
            data-evaluation-results
            class="flex flex-wrap items-center justify-center gap-x-1 gap-y-1"
          >
            <template v-for="(group, index) in rankGroups" :key="index">
              <span v-if="index > 0" class="text-sm select-none">&#x227B;</span>
              <span class="text-base">{{ group.entries.map((e) => e.name).join(', ') }}</span>
            </template>
          </div>
        </template>
        <template v-else>
          <div data-evaluation-results class="flex flex-wrap gap-2">
            <div
              v-for="entry in numericalDisplayData"
              :key="entry.id"
              class="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 border text-sm min-w-18 max-w-full"
              :style="{
                backgroundColor: entry.bgColor,
                borderColor: entry.borderColor,
                color: entry.textColor,
              }"
            >
              <span class="font-medium truncate" :title="entry.name">{{ entry.name }}</span>
              <span class="font-mono text-xs tabular-nums opacity-60 shrink-0">{{
                formatScore(entry.score)
              }}</span>
            </div>
          </div>
        </template>
        <EvaluationStatusFooter
          :status-line="statusLine"
          :copy-text="copyText"
          :copy-text-tex="copyTextTex"
          :result-noun="t('evaluation.nouns.ranking')"
        />
      </template>
    </template>
  </BaseEvaluationWindow>
</template>
