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
  onUnmounted,
  provide,
  ref,
  shallowRef,
  toRef,
  useTemplateRef,
  watch,
  watchEffect,
} from 'vue'
import { useI18n } from 'vue-i18n'

import { abstractArgumentationGlossary } from '@/modules/abstract-argumentation/glossary'
import { NODE_BLUE, NODE_GREEN, NODE_RED } from '@/modules/common/colors'
import type { DocumentId } from '@/modules/common/documents/db'
import BaseEvaluationWindow from '@/modules/common/evaluation/BaseEvaluationWindow.vue'
import EvaluationResultGrid from '@/modules/common/evaluation/EvaluationResultGrid.vue'
import type { Input } from '@/modules/common/evaluation/types'
import { escapeTexText } from '@/modules/common/export/texEscape'
import GroupedSelect, { type GroupedSelectGroup } from '@/modules/common/forms/GroupedSelect.vue'
import ParameterField from '@/modules/common/forms/ParameterField.vue'
import PickerSelect from '@/modules/common/forms/PickerSelect.vue'
import {
  type Highlight,
  TUTORIAL_REF_REGISTRY_KEY,
} from '@/modules/common/graph-editor/graphEditor'
import TermDefinitionBlock from '@/modules/common/tooltip/TermDefinitionBlock.vue'
import { TOOLTIP_REGISTRY_KEY } from '@/modules/common/tooltip/tooltipRegistry'
import type { ExtensionWindowInstanceState } from '@/modules/dialectical-argumentation/evaluation/extensionWindowState'
import {
  type Interpretation,
  KNOWN_SEMANTIC_GROUPS,
  type Semantics,
  useInterpretationEvaluationQuery,
} from '@/modules/dialectical-argumentation/evaluation/tweetyProject'
import { dialecticalArgumentationGlossary } from '@/modules/dialectical-argumentation/glossary'
import type {
  AdfArgumentData,
  DialecticalArgumentation,
} from '@/modules/dialectical-argumentation/model'

const {
  input,
  instanceState,
  instanceOffset = 0,
  documentId,
  stateKey,
  suppressed = false,
  hosted = false,
} = defineProps<{
  input: Input<DialecticalArgumentation<AdfArgumentData>>
  instanceState: ExtensionWindowInstanceState
  instanceOffset?: number
  documentId?: DocumentId
  stateKey?: string
  suppressed?: boolean
  hosted?: boolean
}>()

const emit = defineEmits<{
  'update:instanceState': [state: ExtensionWindowInstanceState]
  highlight: [highlight?: Highlight]
  title: [title: string]
  close: []
  evaluate: []
}>()

provide(TOOLTIP_REGISTRY_KEY, {
  ...abstractArgumentationGlossary,
  ...dialecticalArgumentationGlossary,
})

const { t } = useI18n({ useScope: 'global' })

const semanticGroups = KNOWN_SEMANTIC_GROUPS
const allSemantics = semanticGroups.flatMap((g) => g.semantics)
const semanticsSelectGroups: GroupedSelectGroup<Semantics>[] = semanticGroups.map((g) => ({
  key: g.key,
  displayName: g.displayName,
  options: g.semantics,
}))

function resolveSemanticFromKey(key: string): Semantics {
  return allSemantics.find((s) => s.key === key) ?? allSemantics[0]!
}

const selectedSemantic = shallowRef<Semantics>(resolveSemanticFromKey(instanceState.semanticKey))
const selectedMode = ref<string>(instanceState.mode)

watch([selectedSemantic, selectedMode], () => {
  emit('update:instanceState', {
    id: instanceState.id,
    semanticKey: selectedSemantic.value.key,
    mode: selectedMode.value,
  })
})

const query = useInterpretationEvaluationQuery(
  toRef(() => input),
  computed(() => selectedSemantic.value.key),
  computed(() => selectedMode.value),
  true,
)
const { data } = query

function interpretationKey(interp: Interpretation): string {
  return JSON.stringify(interp.map(({ id, label }) => ({ id, label })))
}

function formatInterpretation(interp: Interpretation): string {
  return interp
    .map(({ name, label }) => {
      if (label === 'in') return name
      if (label === 'out') return `¬${name}`
      return `?${name}`
    })
    .join(', ')
}

function formatInterpretationTex(interp: Interpretation): string {
  return interp
    .map(({ name, label }) => {
      const nameEscaped = escapeTexText(name)
      if (label === 'in') return nameEscaped
      if (label === 'out') return `\\neg ${nameEscaped}`
      return `?${nameEscaped}`
    })
    .join(', ')
}

const selectionHint = computed(() =>
  selectedMode.value === 'enumerate'
    ? t('evaluation.interpretationWindow.selectModelHint')
    : t('evaluation.extensionWindow.selectArgumentHint'),
)
const emptyMessage = computed(() =>
  selectedMode.value === 'enumerate'
    ? t('evaluation.interpretationWindow.noModels')
    : t('evaluation.extensionWindow.noAcceptableArguments'),
)

const formattedData = computed(() => {
  if (data.value === undefined) return undefined

  if (selectedMode.value !== 'enumerate') {
    const accepted = (data.value.interpretations[0] ?? []).filter((a) => a.label === 'in')
    return {
      stateId: data.value.stateId,
      evaluationDurationInMs: data.value.evaluationDurationInMs,
      items: accepted.map((arg) => ({
        key: String(arg.id),
        interpretation: [arg] as Interpretation,
        formatted: arg.name,
        formattedTex: escapeTexText(arg.name),
      })),
    }
  }

  return {
    stateId: data.value.stateId,
    evaluationDurationInMs: data.value.evaluationDurationInMs,
    items: data.value.interpretations.map((interp) => ({
      key: interpretationKey(interp),
      interpretation: interp,
      formatted: formatInterpretation(interp),
      formattedTex: formatInterpretationTex(interp),
    })),
  }
})

const resultItems = computed(
  () =>
    formattedData.value?.items.map((i) => ({
      key: i.key,
      label: selectedMode.value === 'enumerate' ? `{${i.formatted}}` : i.formatted,
      texLabel: selectedMode.value === 'enumerate' ? `\\{${i.formattedTex}\\}` : i.formattedTex,
    })) ?? [],
)

const windowTitle = computed(() => {
  const modeLabel =
    selectedMode.value === 'enumerate'
      ? t('evaluation.modes.enumerate')
      : selectedMode.value === 'credulous'
        ? t('evaluation.modes.credulous')
        : t('evaluation.modes.skeptical')
  return `${selectedSemantic.value.displayName} · ${modeLabel}`
})

const selectedKey = ref<string | undefined>(undefined)
const currentHighlight = computed<Highlight | undefined>(() => {
  if (selectedKey.value === undefined || formattedData.value === undefined) return undefined
  const item = formattedData.value.items.find((i) => i.key === selectedKey.value)
  if (item === undefined) return undefined
  return {
    stateId: formattedData.value.stateId,
    groups: [
      {
        nodes: new Set(item.interpretation.filter((a) => a.label === 'in').map((a) => a.id)),
        color: NODE_GREEN,
      },
      {
        nodes: new Set(item.interpretation.filter((a) => a.label === 'out').map((a) => a.id)),
        color: NODE_RED,
      },
      {
        nodes: new Set(item.interpretation.filter((a) => a.label === 'undec').map((a) => a.id)),
        color: NODE_BLUE,
      },
    ],
  }
})
// Register the semantics selector and the result grid as tutorial-spotlight targets while this
// window is the active one, so the evaluation tutorial can highlight them.
const registerTutorialRef = inject(TUTORIAL_REF_REGISTRY_KEY, null)
const semanticsSelectRef = useTemplateRef<{ $el: HTMLElement }>('semanticsSelect')
const resultsAreaRef = useTemplateRef<HTMLElement>('resultsArea')
watchEffect(() => {
  if (!registerTutorialRef || suppressed) return
  registerTutorialRef('semanticsSelector', semanticsSelectRef.value?.$el ?? null)
})
watch(
  [resultsAreaRef, () => resultItems.value.length, () => suppressed],
  () => {
    if (!registerTutorialRef) return
    const grid = suppressed
      ? null
      : (resultsAreaRef.value?.querySelector<HTMLElement>('.evaluation-result-grid') ?? null)
    registerTutorialRef('resultArea', grid)
  },
  { flush: 'post', immediate: true },
)
onUnmounted(() => {
  registerTutorialRef?.('semanticsSelector', null)
  registerTutorialRef?.('resultArea', null)
})

// Suppressed instances (all but the active one in the compact host) emit no highlight.
const emittedHighlight = computed(() => (suppressed ? undefined : currentHighlight.value))
watch(emittedHighlight, (h) => emit('highlight', h))
function onWindowFocus() {
  emit('highlight', emittedHighlight.value)
}

// The compact host labels its switcher pill with this title (not the raw key).
watch(windowTitle, (title) => emit('title', title), { immediate: true })
</script>

<template>
  <BaseEvaluationWindow
    :title="windowTitle"
    :hosted="hosted"
    :instance-offset="instanceOffset"
    :initial-size="{ width: 400, height: 360 }"
    :query="query"
    :document-id="documentId"
    :state-key="stateKey"
    @close="emit('close')"
    @focus="onWindowFocus"
    @evaluate="emit('evaluate')"
  >
    <template #parameters>
      <ParameterField :label="t('evaluation.fields.semantics')" min-width="10rem">
        <GroupedSelect
          ref="semanticsSelect"
          v-model="selectedSemantic"
          :groups="semanticsSelectGroups"
          full-width
        />
      </ParameterField>
      <ParameterField :label="t('evaluation.fields.mode')" max-width="8rem">
        <PickerSelect
          v-model="selectedMode"
          :options="[
            { value: 'enumerate', label: t('evaluation.modes.enumerate') },
            { value: 'credulous', label: t('evaluation.modes.credulous') },
            { value: 'skeptical', label: t('evaluation.modes.skeptical') },
          ]"
        />
      </ParameterField>
    </template>
    <template #parameters-footer>
      <TermDefinitionBlock v-if="selectedSemantic.tooltipId" :id="selectedSemantic.tooltipId" />
    </template>
    <template #results>
      <div v-if="formattedData !== undefined" ref="resultsArea" class="contents">
        <EvaluationResultGrid
          v-model:selected="selectedKey"
          :result-noun="t('evaluation.nouns.interpretations')"
          :items="resultItems"
          :empty-message="emptyMessage"
          :selection-hint="selectionHint"
          :evaluation-duration-in-ms="formattedData.evaluationDurationInMs"
        />
      </div>
    </template>
  </BaseEvaluationWindow>
</template>
