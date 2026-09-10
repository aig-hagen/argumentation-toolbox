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
import type { AnnotationPosition } from '@aig-hagen/graph-component/lib'
import { VariableIcon } from '@heroicons/vue/24/outline'
import { computed, inject, provide, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { DOCUMENTS_DB_INJECTION_KEY } from '@/modules/common/documents/db'
import { useDocumentUIState } from '@/modules/common/documents/uiState'
import EvaluationHost, { type EvaluationChip } from '@/modules/common/evaluation/EvaluationHost.vue'
import type { Input } from '@/modules/common/evaluation/types'
import type { ExportFileData } from '@/modules/common/export'
import { WindowExport } from '@/modules/common/export/WindowExportAsync'
import {
  type GraphEditorStateLink,
  type GraphEditorStateNode,
  type Highlight,
  type HistoryState,
  LinkType,
  type NodeId,
  type SelectionAction,
} from '@/modules/common/graph-editor/graphEditor'
import GraphEditor from '@/modules/common/graph-editor/GraphEditor.vue'
import { useLayoutMode } from '@/modules/common/layout/useLayoutMode'
import { type DocumentState, modifyDocument } from '@/modules/common/state'
import { TOOLTIP_REGISTRY_KEY } from '@/modules/common/tooltip/tooltipRegistry'
import { commonTutorials } from '@/modules/common/tutorial/editor-navigation'
import {
  type FormulaNode,
  formulaToString,
} from '@/modules/dialectical-argumentation/condition/formula'
import ConditionEditorBar from '@/modules/dialectical-argumentation/ConditionEditorBar.vue'
import ConditionSheet from '@/modules/dialectical-argumentation/ConditionSheet.vue'
import {
  createDefaultExtensionWindowInstance,
  type ExtensionWindowInstanceState,
} from '@/modules/dialectical-argumentation/evaluation/extensionWindowState'
import { availableExports } from '@/modules/dialectical-argumentation/export'
import { dialecticalArgumentationGlossary } from '@/modules/dialectical-argumentation/glossary'
import type {
  AdfArgumentData,
  DialecticalArgumentation,
} from '@/modules/dialectical-argumentation/model'
import { adfBasicsTutorial } from '@/modules/dialectical-argumentation/tutorials/adf-basics'
import { adfEvaluationTutorial } from '@/modules/dialectical-argumentation/tutorials/adf-evaluation'
import WindowInterpretations from '@/modules/dialectical-argumentation/WindowInterpretations.vue'

const { state, historyState, documentId } = defineProps<{
  state: DocumentState<DialecticalArgumentation<AdfArgumentData>>
  historyState: HistoryState
  documentId: number
}>()

const db = inject(DOCUMENTS_DB_INJECTION_KEY)
if (db === undefined) {
  throw new Error('Documents database not provided.')
}

const emit = defineEmits<{
  load: []
  new: []
  change: [state: DocumentState<DialecticalArgumentation<AdfArgumentData>>]
  undo: []
  redo: []
  save: []
  share: []
  export: [filedata: ExportFileData]
}>()

const renderedState = shallowRef(state)
const editorState = shallowRef(transformToEditorState(state, true))

const evaluationInput = computed<Input<DialecticalArgumentation<AdfArgumentData>>>(() => ({
  stateId: renderedState.value.stateId,
  content: renderedState.value.current.content,
}))

watch(
  () => state,
  () => {
    if (state.stateId === renderedState.value.stateId) {
      return
    }
    renderedState.value = state
    editorState.value = transformToEditorState(state, true)
  },
)

function transformToEditorState(
  state: DocumentState<DialecticalArgumentation<AdfArgumentData>>,
  redraw: boolean,
) {
  const adf = state.current.content
  const nodes: GraphEditorStateNode[] = [...adf.arguments()].map(([id, data]) => ({
    id,
    label: data.name,
    x: data.x,
    y: data.y,
  }))
  const links: GraphEditorStateLink[] = [...adf.links()].map(([source, target]) => ({
    sourceId: source,
    targetId: target,
    type: LinkType.SINGLE,
  }))
  return { stateId: state.stateId, nodes, links, redraw }
}

const { t } = useI18n({ useScope: 'global' })

const linkConfig = computed(() => ({
  SINGLE: {
    displayName: t('editor.links.link'),
  },
}))

function createNewState(
  recipe: (draft: DialecticalArgumentation<AdfArgumentData>) => void,
  redraw = false,
) {
  const nextState = modifyDocument(renderedState.value, recipe)
  if (nextState !== undefined) {
    renderedState.value = nextState
    editorState.value = transformToEditorState(nextState, redraw)
    emit('change', nextState)
  }
}

function onNodeDeleted(data: { id: NodeId }) {
  if (selectedNodeId.value === data.id) {
    selectedNodeId.value = null
  }
  createNewState((draft) => draft.deleteArgument(data.id))
}

function onNodeCreated(data: { id: NodeId; label: string; x: number; y: number }) {
  createNewState((draft) =>
    draft.addArgument(data.id, {
      name: data.label,
      x: data.x,
      y: data.y,
      condition: { type: 'tautology' },
    }),
  )
}

function onNodeLabelEdited(data: { id: NodeId; label: string }) {
  createNewState((draft) => {
    draft.getArgument(data.id).name = data.label
  })
}

function onNodesMoved(data: { id: NodeId; x: number; y: number }[]) {
  createNewState((draft) => {
    data.forEach((node) => {
      const argumentData = draft.getArgument(node.id)
      argumentData.x = node.x
      argumentData.y = node.y
    })
  })
}

// Condition editor
const selectedNodeId = ref<NodeId | null>(null)
// Compact renders a bottom sheet instead of the anchored bar.
const isConditionSheetOpen = ref(false)
watch(isConditionSheetOpen, (isOpen) => {
  if (!isOpen) selectedNodeId.value = null
})
const editorAnchor = ref<{ x: number; y: number }>({ x: 0, y: 0 })
const conditionEditCount = ref(0)
const conditionEditorOpenCount = ref(0)
const evaluationCount = ref(0)
const highlightCount = ref(0)

const argNameMap = computed(() => {
  const map = new Map<number, string>()
  for (const [id, data] of renderedState.value.current.content.arguments()) {
    map.set(id, data.name)
  }
  return map
})

function getConditionString(nodeId: NodeId): string {
  const condition = renderedState.value.current.content.getArgument(nodeId).condition
  return formulaToString(condition, argNameMap.value)
}

const conditionAnnotations = computed(() => {
  const annotations = new Map<NodeId, { content: string; position?: AnnotationPosition }>()
  for (const [id, data] of renderedState.value.current.content.arguments()) {
    annotations.set(id, {
      content: getConditionString(id),
      position: data.conditionAnnotationPosition,
    })
  }
  return annotations
})

function openConditionEditor(nodeId: NodeId, event: MouseEvent) {
  selectedNodeId.value = nodeId
  conditionEditorOpenCount.value++
  if (layoutMode.value === 'compact') {
    isConditionSheetOpen.value = true
    return
  }
  const svgEl = (event.currentTarget as SVGElement).ownerSVGElement!
  const rect = svgEl.getBoundingClientRect()
  editorAnchor.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

/** Action-bar button (compact only): open the acceptance-condition sheet for a node. */
function adfNodeSelectionActions(id: NodeId): SelectionAction[] {
  if (layoutMode.value !== 'compact') return []
  return [
    {
      key: 'condition',
      label: t('editor.condition.editCondition'),
      icon: VariableIcon,
      run: () => {
        selectedNodeId.value = id
        conditionEditorOpenCount.value++
        isConditionSheetOpen.value = true
      },
    },
  ]
}

function onAnnotationClicked(data: { id: NodeId; content: string }, event: PointerEvent) {
  event.stopPropagation()
  openConditionEditor(data.id, event)
}

function onAnnotationMoved(data: { id: NodeId; position: AnnotationPosition }[]) {
  createNewState((draft) => {
    for (const { id, position } of data) {
      draft.getArgument(id).conditionAnnotationPosition = position
    }
  })
}

function onConditionChanged(formula: FormulaNode) {
  if (selectedNodeId.value === null) return
  const id = selectedNodeId.value
  createNewState((draft) => draft.setCondition(id, formula), true)
  conditionEditCount.value++
}

// --- Multi-instance window management ---

const extensionInstances = useDocumentUIState<ExtensionWindowInstanceState[]>(
  db,
  documentId,
  'extension-instances',
  [],
)

function addExtensionInstance() {
  extensionInstances.value = [...extensionInstances.value, createDefaultExtensionWindowInstance()]
}

function removeExtensionInstance(id: string, onHighlight: (h?: Highlight) => void) {
  if (extensionInstances.value.length === 1) onHighlight(undefined)
  extensionInstances.value = extensionInstances.value.filter((i) => i.id !== id)
}

function updateExtensionInstance(updated: ExtensionWindowInstanceState) {
  extensionInstances.value = extensionInstances.value.map((i) =>
    i.id === updated.id ? updated : i,
  )
}

// --- Compact evaluation host (mobile) ---

const { layoutMode } = useLayoutMode()
const evaluationHostOpen = ref(false)
const activeExtensionId = ref<string | undefined>(undefined)
// Each hosted window reports its formatted title (semantics name + mode); the switcher
// pill shows that instead of the raw key. Falls back to the key until the first report.
const evaluationTitles = ref<Record<string, string>>({})
function setEvaluationTitle(id: string, title: string) {
  evaluationTitles.value[id] = title
}

const extensionChips = computed<EvaluationChip[]>(() =>
  extensionInstances.value.map((i) => ({
    id: i.id,
    label: evaluationTitles.value[i.id] ?? i.semanticKey,
    kind: 'extension',
  })),
)

provide(TOOLTIP_REGISTRY_KEY, dialecticalArgumentationGlossary)

const adfTutorials = [adfBasicsTutorial, adfEvaluationTutorial, ...commonTutorials]

const tutorialContextExtra = computed(() => ({
  isExtensionWindowOpen: extensionInstances.value.length > 0,
  evaluationWindowCount: extensionInstances.value.length,
  conditionEditCount: conditionEditCount.value,
  conditionEditorOpenCount: conditionEditorOpenCount.value,
  evaluationCount: evaluationCount.value,
  highlightCount: highlightCount.value,
}))
</script>
<template>
  <GraphEditor
    v-if="editorState"
    class="adf-graph"
    :document-id="documentId"
    @new="emit('new')"
    @load="emit('load')"
    @node-created="onNodeCreated"
    @node-deleted="onNodeDeleted"
    @node-label-edited="onNodeLabelEdited"
    @nodes-moved="onNodesMoved"
    @annotation-clicked="onAnnotationClicked"
    @annotation-moved="onAnnotationMoved"
    :link-configs="linkConfig"
    :allow-link-creation="false"
    :allow-link-deletion="false"
    node-tap-action="Open its acceptance condition"
    :node-selection-actions="adfNodeSelectionActions"
    :state="editorState"
    :node-annotations="conditionAnnotations"
    :history-state="historyState"
    :tutorials="adfTutorials"
    default-tutorial-id="adf-basics"
    :tutorial-context-extra="tutorialContextExtra"
    @undo="emit('undo')"
    @redo="emit('redo')"
    @save="emit('save')"
    @share="emit('share')"
    v-model:evaluation-open="evaluationHostOpen"
    @open-extension-window="addExtensionInstance()"
  >
    <template #evaluationExtensions="{ onHighlight }">
      <!-- Compact: one host sheet with a chip switcher over all saved configs. -->
      <EvaluationHost
        v-if="layoutMode === 'compact'"
        v-model:open="evaluationHostOpen"
        v-model:active-id="activeExtensionId"
        :chips="extensionChips"
        @add="addExtensionInstance()"
        @remove="removeExtensionInstance($event, onHighlight)"
      >
        <template #default="{ activeId }">
          <WindowInterpretations
            v-for="instance in extensionInstances"
            v-show="instance.id === activeId"
            :key="instance.id"
            hosted
            :input="evaluationInput"
            :instance-state="instance"
            :document-id="documentId"
            :state-key="`${instance.id}:window`"
            :suppressed="instance.id !== activeId"
            @update:instance-state="updateExtensionInstance($event)"
            @title="setEvaluationTitle(instance.id, $event)"
            @highlight="
              (h) => {
                onHighlight(h)
                if (h) highlightCount++
              }
            "
            @evaluate="evaluationCount++"
          />
        </template>
      </EvaluationHost>

      <!-- Regular: one floating window per saved config. -->
      <WindowInterpretations
        v-for="(instance, index) in extensionInstances"
        v-else
        :key="instance.id"
        :input="evaluationInput"
        :instance-state="instance"
        :instance-offset="index"
        :document-id="documentId"
        :state-key="`${instance.id}:window`"
        @update:instance-state="updateExtensionInstance($event)"
        @highlight="
          (h) => {
            onHighlight(h)
            if (h) highlightCount++
          }
        "
        @evaluate="evaluationCount++"
        @close="removeExtensionInstance(instance.id, onHighlight)"
      />
      <template v-if="layoutMode === 'regular'">
        <Teleport to="body">
          <div
            v-if="selectedNodeId !== null"
            class="fixed inset-0 z-40"
            @click="selectedNodeId = null"
          />
        </Teleport>
        <ConditionEditorBar
          v-if="selectedNodeId !== null"
          :argument-id="selectedNodeId"
          :adf="renderedState.current.content"
          :x="editorAnchor.x"
          :y="editorAnchor.y"
          @update:formula="onConditionChanged"
          @close="selectedNodeId = null"
        />
      </template>
      <ConditionSheet
        v-else
        v-model:open="isConditionSheetOpen"
        :argument-id="selectedNodeId"
        :adf="renderedState.current.content"
        @update:formula="onConditionChanged"
      />
    </template>
    <template #export="{ isOpen, onIsOpen, hasBeenOpened }">
      <WindowExport
        v-if="hasBeenOpened"
        :input="state.current.content"
        :open="isOpen"
        @update:open="onIsOpen"
        :export-configs="availableExports"
        @export="emit('export', $event)"
      />
    </template>
  </GraphEditor>
</template>
