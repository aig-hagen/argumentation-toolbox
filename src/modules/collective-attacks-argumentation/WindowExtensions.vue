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

import { abstractArgumentationGlossary } from '@/modules/abstract-argumentation/glossary'
import type { ExtensionWindowInstanceState } from '@/modules/collective-attacks-argumentation/evaluation/extensionWindowState'
import {
  KNOWN_SEMANTIC_GROUPS,
  type Semantics,
  useSetAfEvaluationQuery,
} from '@/modules/collective-attacks-argumentation/evaluation/tweetyProject'
import { collectiveAttacksArgumentationGlossary } from '@/modules/collective-attacks-argumentation/glossary'
import {
  type SetAF,
  type SetAfArgumentData,
} from '@/modules/collective-attacks-argumentation/model'
import type { DocumentId } from '@/modules/common/documents/db'
import BaseEvaluationWindow from '@/modules/common/evaluation/BaseEvaluationWindow.vue'
import EvaluationResultGrid from '@/modules/common/evaluation/EvaluationResultGrid.vue'
import ModeHint from '@/modules/common/evaluation/ModeHint.vue'
import type { Input } from '@/modules/common/evaluation/types'
import { useExtensionWindowBase } from '@/modules/common/evaluation/useExtensionWindowBase'
import GroupedSelect, { type GroupedSelectGroup } from '@/modules/common/forms/GroupedSelect.vue'
import ParameterField from '@/modules/common/forms/ParameterField.vue'
import PickerSelect from '@/modules/common/forms/PickerSelect.vue'
import type { Highlight } from '@/modules/common/graph-editor/graphEditor'
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
  input: Input<SetAF<SetAfArgumentData>>
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
  ...collectiveAttacksArgumentationGlossary,
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

const query = useSetAfEvaluationQuery(
  toRef(() => input),
  computed(() => selectedSemantic.value.key),
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

// Suppressed instances (all but the active one in the compact host) emit no highlight.
const emittedHighlight = computed(() => (suppressed ? undefined : currentHighlight.value))
watch(emittedHighlight, (h) => emit('highlight', h))
function onWindowFocus() {
  emit('highlight', emittedHighlight.value)
}

const windowTitle = computed(() => {
  const modeLabel =
    selectedMode.value === 'enumerate'
      ? t('evaluation.modes.enumerate')
      : selectedMode.value === 'credulous'
        ? t('evaluation.modes.credulous')
        : t('evaluation.modes.skeptical')
  return `${selectedSemantic.value.displayName} · ${modeLabel}`
})

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
        <GroupedSelect v-model="selectedSemantic" :groups="semanticsSelectGroups" full-width />
      </ParameterField>
      <ParameterField :label="t('evaluation.fields.mode')" max-width="8rem">
        <template #label-suffix>
          <ModeHint :mode="selectedMode" />
        </template>
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
      <TermDefinitionBlock :id="selectedSemantic.key" />
    </template>
    <template #results>
      <template v-if="dataExtensionsFormatedAndSorted !== undefined">
        <EvaluationResultGrid
          v-model:selected="selectedExtension"
          :result-noun="t('evaluation.nouns.extensions')"
          :items="resultItems"
          :empty-message="emptyMessage"
          :selection-hint="selectionHint"
          :evaluation-duration-in-ms="dataExtensionsFormatedAndSorted.evaluationDurationInMs"
        />
      </template>
    </template>
  </BaseEvaluationWindow>
</template>
