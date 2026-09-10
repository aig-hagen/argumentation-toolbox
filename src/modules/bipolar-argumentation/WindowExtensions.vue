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
import type { ExtensionWindowInstanceState } from '@/modules/bipolar-argumentation/evaluation/extensionWindowState'
import {
  KNOWN_SEMANTIC_GROUPS,
  type Semantics,
  useExtensionEvaluationQuery,
} from '@/modules/bipolar-argumentation/evaluation/tweetyProject'
import { bipolarArgumentationGlossary } from '@/modules/bipolar-argumentation/glossary'
import type { BipoloarArgumentation } from '@/modules/bipolar-argumentation/model'
import type { ArgumentData } from '@/modules/common/argumentation/model'
import type { DocumentId } from '@/modules/common/documents/db'
import BaseEvaluationWindow from '@/modules/common/evaluation/BaseEvaluationWindow.vue'
import EvaluationResultGrid from '@/modules/common/evaluation/EvaluationResultGrid.vue'
import type { Input } from '@/modules/common/evaluation/types'
import { useExtensionWindowBase } from '@/modules/common/evaluation/useExtensionWindowBase'
import GroupedSelect, { type GroupedSelectGroup } from '@/modules/common/forms/GroupedSelect.vue'
import ParameterField from '@/modules/common/forms/ParameterField.vue'
import PickerSelect from '@/modules/common/forms/PickerSelect.vue'
import {
  type Highlight,
  TUTORIAL_REF_REGISTRY_KEY,
} from '@/modules/common/graph-editor/graphEditor'
import TermDefinitionBlock from '@/modules/common/tooltip/TermDefinitionBlock.vue'
import { TOOLTIP_REGISTRY_KEY } from '@/modules/common/tooltip/tooltipRegistry'

const {
  input,
  instanceState,
  instanceOffset = 0,
  documentId,
  stateKey,
  suppressed = false,
  hosted = false,
} = defineProps<{
  input: Input<BipoloarArgumentation<ArgumentData>>
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

provide(TOOLTIP_REGISTRY_KEY, { ...abstractArgumentationGlossary, ...bipolarArgumentationGlossary })

const { t } = useI18n({ useScope: 'global' })

const semanticGroups = KNOWN_SEMANTIC_GROUPS
const semanticsSelectGroups: GroupedSelectGroup<Semantics>[] = semanticGroups.map((g) => ({
  key: g.key,
  displayName: g.displayName,
  options: g.semantics,
}))

function resolveSemanticFromKey(key: string): Semantics {
  const found = semanticGroups.flatMap((g) => g.semantics).find((s) => s.key === key)
  return found ?? semanticGroups[0]!.semantics[0]!
}

const selectedSupportType = ref<string>(instanceState.supportTypeKey)
const selectedSemantics = shallowRef<Semantics>(resolveSemanticFromKey(instanceState.semanticKey))
const selectedMode = ref<string>(instanceState.mode)

watch([selectedSemantics, selectedSupportType, selectedMode], () => {
  emit('update:instanceState', {
    id: instanceState.id,
    semanticKey: selectedSemantics.value.key,
    supportTypeKey: selectedSupportType.value,
    mode: selectedMode.value,
  })
})

const query = useExtensionEvaluationQuery(
  toRef(() => input),
  computed(() => selectedSemantics.value.key),
  selectedSupportType,
  selectedMode,
  true,
)

const {
  selectedExtension,
  selectionHint,
  emptyMessage,
  dataExtensionsFormatedAndSorted,
  resultItems,
  currentHighlight,
} = useExtensionWindowBase(selectedMode, query)

// Register the support/semantics selectors and the result grid as tutorial-spotlight targets
// while this window is the active one, so the evaluation tutorial can highlight them.
const registerTutorialRef = inject(TUTORIAL_REF_REGISTRY_KEY, null)
const supportSelectRef = useTemplateRef<{ $el: HTMLElement }>('supportSelect')
const semanticsSelectRef = useTemplateRef<{ $el: HTMLElement }>('semanticsSelect')
const resultsAreaRef = useTemplateRef<HTMLElement>('resultsArea')
watchEffect(() => {
  if (!registerTutorialRef || suppressed) return
  registerTutorialRef('supportSelector', supportSelectRef.value?.$el ?? null)
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
  registerTutorialRef?.('supportSelector', null)
  registerTutorialRef?.('semanticsSelector', null)
  registerTutorialRef?.('resultArea', null)
})

// Suppressed instances (all but the active one in the compact host) emit no highlight.
const emittedHighlight = computed(() => (suppressed ? undefined : currentHighlight.value))
watch(emittedHighlight, (h) => emit('highlight', h))
function onWindowFocus() {
  emit('highlight', emittedHighlight.value)
}

const supportTypeTooltipId = computed(() => {
  const support = selectedSupportType.value
  return support === 'ded'
    ? 'deductiveSupport'
    : support === 'nec'
      ? 'necessarySupport'
      : 'coalitionSemantics'
})

const windowTitle = computed(() => {
  const modeLabel =
    selectedMode.value === 'enumerate'
      ? t('evaluation.modes.enumerate')
      : selectedMode.value === 'credulous'
        ? t('evaluation.modes.credulous')
        : t('evaluation.modes.skeptical')
  const supportLabel =
    selectedSupportType.value === 'ded'
      ? t('evaluation.support.deductive')
      : selectedSupportType.value === 'nec'
        ? t('evaluation.support.necessary')
        : t('evaluation.support.coalition')
  return `${supportLabel} · ${selectedSemantics.value.displayName} · ${modeLabel}`
})

// The compact host labels its switcher pill with this title (not the raw key).
watch(windowTitle, (t) => emit('title', t), { immediate: true })
</script>

<template>
  <BaseEvaluationWindow
    :title="windowTitle"
    :hosted="hosted"
    :instance-offset="instanceOffset"
    :initial-size="{ width: 570, height: 400 }"
    :query="query"
    :document-id="documentId"
    :state-key="stateKey"
    @close="emit('close')"
    @focus="onWindowFocus"
    @evaluate="emit('evaluate')"
  >
    <template #parameters>
      <ParameterField :label="t('evaluation.support.label')" max-width="10rem">
        <PickerSelect
          ref="supportSelect"
          v-model="selectedSupportType"
          :options="[
            { value: 'coalition', label: t('evaluation.support.coalition') },
            { value: 'ded', label: t('evaluation.support.deductive') },
            { value: 'nec', label: t('evaluation.support.necessary') },
          ]"
        />
      </ParameterField>
      <ParameterField :label="t('evaluation.fields.semantics')" min-width="10rem">
        <GroupedSelect
          ref="semanticsSelect"
          v-model="selectedSemantics"
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
      <TermDefinitionBlock :id="supportTypeTooltipId" />
      <TermDefinitionBlock :id="selectedSemantics.tooltipId ?? selectedSemantics.key" />
    </template>
    <template #results>
      <div v-if="dataExtensionsFormatedAndSorted !== undefined" ref="resultsArea" class="contents">
        <EvaluationResultGrid
          v-model:selected="selectedExtension"
          :result-noun="t('evaluation.nouns.extensions')"
          :items="resultItems"
          :empty-message="emptyMessage"
          :selection-hint="selectionHint"
          :evaluation-duration-in-ms="dataExtensionsFormatedAndSorted.evaluationDurationInMs"
        />
      </div>
    </template>
  </BaseEvaluationWindow>
</template>
