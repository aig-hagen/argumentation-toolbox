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
import { computed, inject, provide, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { abstractArgumentationGlossary } from '@/modules/abstract-argumentation/glossary'
import {
  createDefaultExtensionWindowInstance,
  type ExtensionWindowInstanceState,
} from '@/modules/bipolar-argumentation/evaluation/extensionWindowState'
import { availableExports } from '@/modules/bipolar-argumentation/export'
import { bipolarArgumentationGlossary } from '@/modules/bipolar-argumentation/glossary'
import type { BipoloarArgumentation } from '@/modules/bipolar-argumentation/model'
import { bipolarBasicsTutorial } from '@/modules/bipolar-argumentation/tutorials/bipolar-basics'
import { bipolarEvaluationTutorial } from '@/modules/bipolar-argumentation/tutorials/bipolar-evaluation'
import WindowExtensions from '@/modules/bipolar-argumentation/WindowExtensions.vue'
import type { ArgumentData } from '@/modules/common/argumentation/model'
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
} from '@/modules/common/graph-editor/graphEditor'
import GraphEditor from '@/modules/common/graph-editor/GraphEditor.vue'
import { useLayoutMode } from '@/modules/common/layout/useLayoutMode'
import { type DocumentState, modifyDocument } from '@/modules/common/state'
import { TOOLTIP_REGISTRY_KEY } from '@/modules/common/tooltip/tooltipRegistry'
import { commonTutorials } from '@/modules/common/tutorial/editor-navigation'

const { state, historyState, documentId } = defineProps<{
  state: DocumentState<BipoloarArgumentation<ArgumentData>>
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
  change: [state: DocumentState<BipoloarArgumentation<ArgumentData>>]
  undo: []
  redo: []
  save: []
  share: []
  export: [filedata: ExportFileData]
}>()

const evaluationInput = computed<Input<BipoloarArgumentation<ArgumentData>>>(() => {
  return {
    stateId: state.stateId,
    content: state.current.content,
  }
})

const renderedState = shallowRef(state)
const editorState = shallowRef(transformToEditorState(state, true))
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
  state: DocumentState<BipoloarArgumentation<ArgumentData>>,
  redraw: boolean,
) {
  const argumentation = state.current.content
  const nodes: GraphEditorStateNode[] = [...argumentation.arguments()].map(([id, data]) => {
    return {
      id: id,
      label: data.name,
      x: data.x,
      y: data.y,
    }
  })
  const attackLinks: GraphEditorStateLink[] = [...argumentation.attacks()].map(
    ([source, target]) => ({
      sourceId: source,
      targetId: target,
      type: LinkType.SINGLE,
    }),
  )
  const supportLinks: GraphEditorStateLink[] = [...argumentation.supports()].map(
    ([source, target]) => ({
      sourceId: source,
      targetId: target,
      type: LinkType.DOUBLE,
    }),
  )
  const links = [...attackLinks, ...supportLinks]
  return {
    stateId: state.stateId,
    nodes,
    links,
    redraw,
  }
}

const { t } = useI18n({ useScope: 'global' })

const linkConfig = computed(() => ({
  SINGLE: {
    displayName: t('editor.links.attack'),
  },
  DOUBLE: {
    displayName: t('editor.links.support'),
  },
}))

function createNewState(recipe: (draft: BipoloarArgumentation<ArgumentData>) => void) {
  if (renderedState.value === undefined) {
    throw new Error('Cannot create new state from undefined state.')
  }
  const nextState = modifyDocument(renderedState.value, recipe)
  if (nextState !== undefined) {
    renderedState.value = nextState
    editorState.value = transformToEditorState(nextState, false)

    emit('change', nextState)
  }
}

function onNodeDeleted(data: { id: NodeId }) {
  createNewState((draft) => draft.deleteArgument(data.id))
}

function onNodeCreated(data: { id: NodeId; label: string; x: number; y: number }) {
  const argumentData = {
    name: data.label,
    x: data.x,
    y: data.y,
  }
  createNewState((draft) => draft.addArgument(data.id, argumentData))
}

function onNodeLabelEdited(data: { id: NodeId; label: string }) {
  createNewState((draft) => {
    draft.getArgument(data.id).name = data.label
  })
}

function onNodesMoved(
  data: {
    id: NodeId
    x: number
    y: number
  }[],
) {
  createNewState((draft) => {
    data.forEach((node) => {
      const argumentData = draft.getArgument(node.id)
      argumentData.x = node.x
      argumentData.y = node.y
    })
  })
}

function onLinkCreated(data: { sourceId: NodeId; targetId: NodeId; type: LinkType }) {
  onLinkCreatedOrChanged(data)
}

function onLinkDeleted(data: { sourceId: NodeId; targetId: NodeId }) {
  createNewState((draft) => draft.deleteAttackOrSupport(data.sourceId, data.targetId))
}

function onLinkChanged(data: { sourceId: NodeId; targetId: NodeId; type: LinkType }) {
  onLinkCreatedOrChanged(data)
}

function onLinkCreatedOrChanged(data: { sourceId: NodeId; targetId: NodeId; type: LinkType }) {
  if (data.type === LinkType.SINGLE) {
    createNewState((draft) => draft.addAttack(data.sourceId, data.targetId))
  } else {
    createNewState((draft) => draft.addSupport(data.sourceId, data.targetId))
  }
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

// Make the bipolar glossary available to tutorial steps that reference terms (e.g. BAF).
provide(TOOLTIP_REGISTRY_KEY, { ...abstractArgumentationGlossary, ...bipolarArgumentationGlossary })

const bipolarTutorials = [bipolarBasicsTutorial, bipolarEvaluationTutorial, ...commonTutorials]

const evaluationCount = ref(0)
const highlightCount = ref(0)

const tutorialContextExtra = computed(() => ({
  isExtensionWindowOpen: extensionInstances.value.length > 0,
  evaluationWindowCount: extensionInstances.value.length,
  evaluationCount: evaluationCount.value,
  highlightCount: highlightCount.value,
}))
</script>
<template>
  <GraphEditor
    v-if="editorState"
    :document-id="documentId"
    @new="emit('new')"
    @load="emit('load')"
    @node-created="onNodeCreated"
    @node-deleted="onNodeDeleted"
    @node-label-edited="onNodeLabelEdited"
    @nodes-moved="onNodesMoved"
    @link-created="onLinkCreated"
    @link-changed="onLinkChanged"
    @link-deleted="onLinkDeleted"
    :link-configs="linkConfig"
    :state="editorState"
    :history-state="historyState"
    :tutorials="bipolarTutorials"
    default-tutorial-id="bipolar-basics"
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
          <WindowExtensions
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
      <WindowExtensions
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
