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
import { NodeOutline } from '@aig-hagen/graph-component/lib'
import { ArrowsRightLeftIcon } from '@heroicons/vue/24/outline'
import { computed, inject, provide, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { abstractArgumentationGlossary } from '@/modules/abstract-argumentation/glossary'
import { DOCUMENTS_DB_INJECTION_KEY } from '@/modules/common/documents/db'
import { useDocumentUIState } from '@/modules/common/documents/uiState'
import EvaluationHost, { type EvaluationChip } from '@/modules/common/evaluation/EvaluationHost.vue'
import type { Input } from '@/modules/common/evaluation/types'
import type { ExportFileData } from '@/modules/common/export'
import { WindowExport } from '@/modules/common/export/WindowExportAsync'
import ArrowLongRightDashedIcon from '@/modules/common/graph-editor/ArrowLongRightDashedIcon.vue'
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
  createDefaultExtensionWindowInstance,
  type ExtensionWindowInstanceState,
} from '@/modules/incomplete-argumentation/evaluation/extensionWindowState'
import { availableExports } from '@/modules/incomplete-argumentation/export'
import { incompleteArgumentationGlossary } from '@/modules/incomplete-argumentation/glossary'
import type {
  IafArgumentData,
  IncompleteArgumentation,
} from '@/modules/incomplete-argumentation/model'
import { iafBasicsTutorial } from '@/modules/incomplete-argumentation/tutorials/iaf-basics'
import { iafEvaluationTutorial } from '@/modules/incomplete-argumentation/tutorials/iaf-evaluation'
import WindowExtensions from '@/modules/incomplete-argumentation/WindowExtensions.vue'

const { state, historyState, documentId } = defineProps<{
  state: DocumentState<IncompleteArgumentation<IafArgumentData>>
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
  change: [state: DocumentState<IncompleteArgumentation<IafArgumentData>>]
  undo: []
  redo: []
  save: []
  share: []
  export: [filedata: ExportFileData]
}>()

const evaluationInput = computed<Input<IncompleteArgumentation<IafArgumentData>>>(() => ({
  stateId: state.stateId,
  content: state.current.content,
}))

const isDefiniteArgumentMode = ref(true)

const renderedState = shallowRef(state)
const editorState = shallowRef(transformToEditorState(state, true))

watch(
  () => state,
  () => {
    if (state.stateId === renderedState.value.stateId) return
    renderedState.value = state
    editorState.value = transformToEditorState(state, true)
  },
)

function transformToEditorState(
  state: DocumentState<IncompleteArgumentation<IafArgumentData>>,
  redraw: boolean,
) {
  const argumentation = state.current.content
  const nodes: GraphEditorStateNode[] = [...argumentation.arguments()].map(([id, data]) => ({
    id,
    label: data.name,
    x: data.x,
    y: data.y,
  }))
  const definiteAttackLinks: GraphEditorStateLink[] = [...argumentation.definiteAttacks()].map(
    ([sourceId, targetId]) => ({ sourceId, targetId, type: LinkType.SINGLE }),
  )
  const uncertainAttackLinks: GraphEditorStateLink[] = [...argumentation.uncertainAttacks()].map(
    ([sourceId, targetId]) => ({ sourceId, targetId, type: LinkType.DOUBLE }),
  )
  return {
    stateId: state.stateId,
    nodes,
    links: [...definiteAttackLinks, ...uncertainAttackLinks],
    redraw,
  }
}

const { t } = useI18n({ useScope: 'global' })

const linkConfig = computed(() => ({
  SINGLE: { displayName: t('editor.links.definiteAttack') },
  DOUBLE: {
    displayName: t('editor.links.uncertainAttack'),
    arrowType: 'SINGLE' as const,
    dashArray: '8 4',
    icon: ArrowLongRightDashedIcon,
  },
}))

const argumentOutlines = computed(() => {
  const outlines = new Map<NodeId, NodeOutline>()
  for (const [id] of renderedState.value.current.content.uncertainArguments()) {
    outlines.set(id, NodeOutline.DASHED)
  }
  return outlines
})

function createNewState(recipe: (draft: IncompleteArgumentation<IafArgumentData>) => void) {
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
  const argumentData: IafArgumentData = {
    name: data.label,
    x: data.x,
    y: data.y,
    uncertain: !isDefiniteArgumentMode.value,
  }
  createNewState((draft) => draft.addArgument(data.id, argumentData))
}

function onNodeLabelEdited(data: { id: NodeId; label: string }) {
  createNewState((draft) => {
    draft.getArgument(data.id).name = data.label
  })
}

function toggleArgumentCertainty(id: NodeId) {
  createNewState((draft) => {
    const argument = draft.getArgument(id)
    argument.uncertain = !argument.uncertain
  })
}

/** Action-bar button: flip a selected argument between definite and uncertain. */
function iafNodeSelectionActions(id: NodeId): SelectionAction[] {
  const uncertain = renderedState.value.current.content.getArgument(id).uncertain
  return [
    {
      key: 'certainty',
      label: uncertain ? 'Mark definite' : 'Mark uncertain',
      icon: ArrowsRightLeftIcon,
      // In-place switcher: stay open so the user can toggle certainty across taps.
      keepOpen: true,
      run: () => toggleArgumentCertainty(id),
    },
  ]
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

function onLinkCreated(data: { sourceId: NodeId; targetId: NodeId; type: LinkType }) {
  onLinkCreatedOrChanged(data)
}

function onLinkDeleted(data: { sourceId: NodeId; targetId: NodeId }) {
  createNewState((draft) => draft.deleteAttack(data.sourceId, data.targetId))
}

function onLinkChanged(data: { sourceId: NodeId; targetId: NodeId; type: LinkType }) {
  onLinkCreatedOrChanged(data)
}

function onLinkCreatedOrChanged(data: { sourceId: NodeId; targetId: NodeId; type: LinkType }) {
  if (data.type === LinkType.SINGLE) {
    createNewState((draft) => draft.addDefiniteAttack(data.sourceId, data.targetId))
  } else {
    createNewState((draft) => draft.addUncertainAttack(data.sourceId, data.targetId))
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

provide(TOOLTIP_REGISTRY_KEY, {
  ...abstractArgumentationGlossary,
  ...incompleteArgumentationGlossary,
})

const iafTutorials = [iafBasicsTutorial, iafEvaluationTutorial, ...commonTutorials]

const evaluationCount = ref(0)
const highlightCount = ref(0)

const tutorialContextExtra = computed(() => ({
  uncertainNodeCount: [...renderedState.value.current.content.uncertainArguments()].length,
  uncertainLinkCount: [...renderedState.value.current.content.uncertainAttacks()].length,
  isExtensionWindowOpen: extensionInstances.value.length > 0,
  evaluationWindowCount: extensionInstances.value.length,
  evaluationCount: evaluationCount.value,
  highlightCount: highlightCount.value,
}))

const argumentModeButtonRef = useTemplateRef<HTMLElement>('argumentModeButton')
const mobileArgumentModeButtonRef = useTemplateRef<HTMLElement>('mobileArgumentModeButton')

const tutorialRefs = computed(() => ({
  // Only one of the two layouts is mounted at a time; pick whichever is live.
  argumentModeButton: argumentModeButtonRef.value ?? mobileArgumentModeButtonRef.value ?? null,
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
    :node-outlines="argumentOutlines"
    :node-selection-actions="iafNodeSelectionActions"
    :state="editorState"
    :history-state="historyState"
    :tutorials="iafTutorials"
    default-tutorial-id="iaf-basics"
    :tutorial-context-extra="tutorialContextExtra"
    :tutorial-refs="tutorialRefs"
    @undo="emit('undo')"
    @redo="emit('redo')"
    @save="emit('save')"
    @share="emit('share')"
    v-model:evaluation-open="evaluationHostOpen"
    @open-extension-window="addExtensionInstance()"
  >
    <template #canvasSelector>
      <!-- Compact twin of the desktop argument-type toolbar (horizontal). -->
      <div ref="mobileArgumentModeButton" class="join shadow-md" title="Argument type">
        <button
          class="join-item btn btn-sm btn-square"
          :class="isDefiniteArgumentMode ? 'btn-primary' : 'btn-neutral'"
          :aria-pressed="isDefiniteArgumentMode"
          aria-label="Definite argument"
          @click="isDefiniteArgumentMode = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
        <button
          class="join-item btn btn-sm btn-square"
          :class="!isDefiniteArgumentMode ? 'btn-primary' : 'btn-neutral'"
          :aria-pressed="!isDefiniteArgumentMode"
          aria-label="Uncertain argument"
          @click="isDefiniteArgumentMode = false"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-dasharray="3 2"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
      </div>
    </template>
    <template #toolbar>
      <div ref="argumentModeButton" class="join join-vertical mb-2" title="Argument type">
        <button
          class="join-item btn btn-square btn-sm"
          :class="{ 'btn-active': isDefiniteArgumentMode }"
          title="Definite argument"
          @click="isDefiniteArgumentMode = true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
        <button
          class="join-item btn btn-square btn-sm"
          :class="{ 'btn-active': !isDefiniteArgumentMode }"
          title="Uncertain argument"
          @click="isDefiniteArgumentMode = false"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-dasharray="3 2"
          >
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
      </div>
    </template>
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
