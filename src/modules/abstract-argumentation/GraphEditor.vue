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

import {
  createDefaultExtensionWindowInstance,
  type ExtensionWindowInstanceState,
} from '@/modules/abstract-argumentation/evaluation/extensionWindowState'
import {
  createDefaultRankingWindowInstance,
  type RankingWindowInstanceState,
} from '@/modules/abstract-argumentation/evaluation/rankingWindowState'
import {
  createDefaultSerialisationWindowInstance,
  type SerialisationWindowInstanceState,
} from '@/modules/abstract-argumentation/evaluation/serialisationWindowState'
import { availableExports } from '@/modules/abstract-argumentation/export'
import { abstractArgumentationGlossary } from '@/modules/abstract-argumentation/glossary'
import { type AbstractArgumentation } from '@/modules/abstract-argumentation/model'
import { afBasicsTutorial } from '@/modules/abstract-argumentation/tutorials/af-basics'
import { afEvaluationTutorial } from '@/modules/abstract-argumentation/tutorials/af-evaluation'
import WindowExtensions from '@/modules/abstract-argumentation/WindowExtensions.vue'
import WindowRanking from '@/modules/abstract-argumentation/WindowRanking.vue'
import WindowSerialisation from '@/modules/abstract-argumentation/WindowSerialisation.vue'
import type { ArgumentData, ArgumentId } from '@/modules/common/argumentation/model'
import { DOCUMENTS_DB_INJECTION_KEY } from '@/modules/common/documents/db'
import { useDocumentUIState } from '@/modules/common/documents/uiState'
import EvaluationHost, { type EvaluationChip } from '@/modules/common/evaluation/EvaluationHost.vue'
import type { EvaluationKind, Input } from '@/modules/common/evaluation/types'
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
  state: DocumentState<AbstractArgumentation<ArgumentData>>
  historyState: HistoryState
  documentId: number
}>()

const db = inject(DOCUMENTS_DB_INJECTION_KEY)
if (db === undefined) {
  throw new Error('Documents database not provided.')
}

const evaluationInput = computed<Input<AbstractArgumentation<ArgumentData>>>(() => {
  return {
    stateId: state.stateId,
    content: state.current.content,
  }
})

const emit = defineEmits<{
  load: []
  new: []
  change: [state: DocumentState<AbstractArgumentation<ArgumentData>>]
  undo: []
  redo: []
  save: []
  share: []
  export: [filedata: ExportFileData]
}>()

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
  state: DocumentState<AbstractArgumentation<ArgumentData>>,
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
  const links: GraphEditorStateLink[] = [...argumentation.attacks()].map(([source, target]) => ({
    sourceId: source,
    targetId: target,
    type: LinkType.SINGLE,
  }))
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
}))

function createNewState(recipe: (draft: AbstractArgumentation<ArgumentData>) => void) {
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

const nodeWeights = shallowRef<Map<ArgumentId, number>>(new Map())

function onSetWeights(weights: Array<{ id: ArgumentId; weight: number }>) {
  nodeWeights.value = new Map(weights.map(({ id, weight }) => [id, weight]))
}

// --- Highlight/weight visibility across evaluation window instances ---
// Only the most recently focused window's result is shown on the canvas, so
// e.g. an Extension selection and a Ranking don't render on top of each other,
// and so multiple windows of the same type (e.g. two Extension windows) don't
// both claim to be active at once.
type HighlightSource = 'extension' | 'ranking' | 'serialisation'
const activeWindow = ref<{ source: HighlightSource; id: string } | undefined>(undefined)

function isSuppressed(source: HighlightSource, id: string): boolean {
  return activeWindow.value?.source !== source || activeWindow.value.id !== id
}

const visibleNodeWeights = computed(() =>
  activeWindow.value?.source === 'ranking' ? nodeWeights.value : new Map(),
)

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

function onLinkCreated(data: { sourceId: NodeId; targetId: NodeId }) {
  createNewState((draft) => draft.addAttack(data.sourceId, data.targetId))
}

function onLinkDeleted(data: { sourceId: NodeId; targetId: NodeId }) {
  createNewState((draft) => draft.deleteAttack(data.sourceId, data.targetId))
}

// --- Multi-instance window management ---

const extensionInstances = useDocumentUIState<ExtensionWindowInstanceState[]>(
  db,
  documentId,
  'extension-instances',
  [],
)
const rankingInstances = useDocumentUIState<RankingWindowInstanceState[]>(
  db,
  documentId,
  'ranking-instances',
  [],
)

function addExtensionInstance() {
  extensionInstances.value = [...extensionInstances.value, createDefaultExtensionWindowInstance()]
}

function removeExtensionInstance(id: string, onHighlight: (h?: Highlight) => void) {
  if (activeWindow.value?.id === id) {
    onHighlight(undefined)
    activeWindow.value = undefined
  }
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

// Each hosted window reports its formatted title (semantics name + mode); the switcher
// pill shows that instead of the raw key. Falls back to the key until the first report.
const evaluationTitles = ref<Record<string, string>>({})
function setEvaluationTitle(id: string, title: string) {
  evaluationTitles.value[id] = title
}

// One chip row over all three evaluation kinds; the icon disambiguates the kind.
const evaluationChips = computed<EvaluationChip[]>(() => [
  ...extensionInstances.value.map((i) => ({
    id: i.id,
    label: evaluationTitles.value[i.id] ?? i.semanticKey,
    kind: 'extension' as const,
  })),
  ...rankingInstances.value.map((i) => ({
    id: i.id,
    label: evaluationTitles.value[i.id] ?? i.semanticKey,
    kind: 'ranking' as const,
  })),
  ...serialisationInstances.value.map((i) => ({
    id: i.id,
    label: evaluationTitles.value[i.id] ?? i.selectionFunctionKey,
    kind: 'serialisation' as const,
  })),
])

const addableKinds: EvaluationKind[] = ['extension', 'ranking', 'serialisation']

// The host's active chip is the highlighted window; only it highlights the canvas.
// A single active id spans all kinds, mapping back to the right highlight source.
const activeEvaluationId = computed<string | undefined>({
  get: () => activeWindow.value?.id,
  set: (id) => {
    if (id === undefined) {
      activeWindow.value = undefined
      return
    }
    const source: HighlightSource | undefined = extensionInstances.value.some((i) => i.id === id)
      ? 'extension'
      : rankingInstances.value.some((i) => i.id === id)
        ? 'ranking'
        : serialisationInstances.value.some((i) => i.id === id)
          ? 'serialisation'
          : undefined
    activeWindow.value = source ? { source, id } : undefined
  },
})

function lastId<T extends { id: string }>(items: T[]): string | undefined {
  return items.length > 0 ? items[items.length - 1]!.id : undefined
}

function addEvaluation(kind: EvaluationKind) {
  if (kind === 'ranking') {
    addRankingInstance()
    activeEvaluationId.value = lastId(rankingInstances.value)
  } else if (kind === 'serialisation') {
    addSerialisationInstance()
    activeEvaluationId.value = lastId(serialisationInstances.value)
  } else {
    addExtensionInstance()
    activeEvaluationId.value = lastId(extensionInstances.value)
  }
}

function removeEvaluation(id: string, onHighlight: (h?: Highlight) => void) {
  if (rankingInstances.value.some((i) => i.id === id)) removeRankingInstance(id)
  else if (serialisationInstances.value.some((i) => i.id === id))
    removeSerialisationInstance(id, onHighlight)
  else removeExtensionInstance(id, onHighlight)
}

function addRankingInstance() {
  rankingInstances.value = [...rankingInstances.value, createDefaultRankingWindowInstance()]
}

function removeRankingInstance(id: string) {
  if (activeWindow.value?.id === id) {
    nodeWeights.value = new Map()
    activeWindow.value = undefined
  }
  rankingInstances.value = rankingInstances.value.filter((i) => i.id !== id)
}

function updateRankingInstance(updated: RankingWindowInstanceState) {
  rankingInstances.value = rankingInstances.value.map((i) => (i.id === updated.id ? updated : i))
}

const serialisationInstances = useDocumentUIState<SerialisationWindowInstanceState[]>(
  db,
  documentId,
  'serialisation-instances',
  [],
)

function addSerialisationInstance() {
  serialisationInstances.value = [
    ...serialisationInstances.value,
    createDefaultSerialisationWindowInstance(),
  ]
}

function removeSerialisationInstance(id: string, onHighlight: (h?: Highlight) => void) {
  if (activeWindow.value?.id === id) {
    onHighlight(undefined)
    activeWindow.value = undefined
  }
  serialisationInstances.value = serialisationInstances.value.filter((i) => i.id !== id)
}

function updateSerialisationInstance(updated: SerialisationWindowInstanceState) {
  serialisationInstances.value = serialisationInstances.value.map((i) =>
    i.id === updated.id ? updated : i,
  )
}

provide(TOOLTIP_REGISTRY_KEY, abstractArgumentationGlossary)

const afTutorials = [afBasicsTutorial, afEvaluationTutorial, ...commonTutorials]

const evaluationCount = ref(0)
const highlightCount = ref(0)
const semanticsInteractCount = ref(0)
const modeInteractCount = ref(0)

const tutorialContextExtra = computed(() => ({
  isExtensionWindowOpen: extensionInstances.value.length > 0,
  evaluationWindowCount:
    extensionInstances.value.length +
    rankingInstances.value.length +
    serialisationInstances.value.length,
  evaluationCount: evaluationCount.value,
  highlightCount: highlightCount.value,
  semanticsInteractCount: semanticsInteractCount.value,
  modeInteractCount: modeInteractCount.value,
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
    @link-deleted="onLinkDeleted"
    :link-configs="linkConfig"
    :state="editorState"
    :node-weights="visibleNodeWeights"
    @undo="emit('undo')"
    @redo="emit('redo')"
    @save="emit('save')"
    @share="emit('share')"
    :history-state="historyState"
    :tutorials="afTutorials"
    default-tutorial-id="af-basics"
    :tutorial-context-extra="tutorialContextExtra"
    v-model:evaluation-open="evaluationHostOpen"
    @open-extension-window="addExtensionInstance()"
    @open-ranking-window="addRankingInstance()"
    @open-serialisation-window="addSerialisationInstance()"
  >
    <template #evaluationExtensions="{ onHighlight }">
      <!-- Compact: one host sheet with a chip switcher over all saved configs of every kind. -->
      <EvaluationHost
        v-if="layoutMode === 'compact'"
        v-model:open="evaluationHostOpen"
        v-model:active-id="activeEvaluationId"
        :chips="evaluationChips"
        :add-kinds="addableKinds"
        @add="addEvaluation($event)"
        @remove="removeEvaluation($event, onHighlight)"
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
            @semantics-interact="semanticsInteractCount++"
            @mode-interact="modeInteractCount++"
          />
          <WindowRanking
            v-for="instance in rankingInstances"
            v-show="instance.id === activeId"
            :key="instance.id"
            hosted
            :input="evaluationInput"
            :instance-state="instance"
            :document-id="documentId"
            :state-key="`${instance.id}:window`"
            :suppressed="instance.id !== activeId"
            @update:instance-state="updateRankingInstance($event)"
            @title="setEvaluationTitle(instance.id, $event)"
            @set-weights="(w) => instance.id === activeId && onSetWeights(w)"
          />
          <!-- Wrapper element carries v-show: WindowSerialisation has a multi-root
               template (reusable body), so v-show can't attach directly to it. -->
          <div
            v-for="instance in serialisationInstances"
            v-show="instance.id === activeId"
            :key="instance.id"
          >
            <WindowSerialisation
              hosted
              :input="evaluationInput"
              :instance-state="instance"
              :document-id="documentId"
              :state-key="`${instance.id}:window`"
              :suppressed="instance.id !== activeId"
              @update:instance-state="updateSerialisationInstance($event)"
              @title="setEvaluationTitle(instance.id, $event)"
              @highlight="onHighlight"
            />
          </div>
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
        :suppressed="isSuppressed('extension', instance.id)"
        @update:instance-state="updateExtensionInstance($event)"
        @highlight="
          (h) => {
            onHighlight(h)
            if (h) highlightCount++
          }
        "
        @focus="activeWindow = { source: 'extension', id: instance.id }"
        @evaluate="evaluationCount++"
        @semantics-interact="semanticsInteractCount++"
        @mode-interact="modeInteractCount++"
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
    <!-- Compact renders ranking/serialisation inside the host above; these desktop
         floating windows are regular-layout only. -->
    <template #evaluationRanking>
      <WindowRanking
        v-for="(instance, index) in layoutMode === 'regular' ? rankingInstances : []"
        :key="instance.id"
        :input="evaluationInput"
        :instance-state="instance"
        :instance-offset="index"
        :document-id="documentId"
        :state-key="`${instance.id}:window`"
        :suppressed="isSuppressed('ranking', instance.id)"
        @update:instance-state="updateRankingInstance($event)"
        @set-weights="
          (w) => {
            if (!isSuppressed('ranking', instance.id)) onSetWeights(w)
          }
        "
        @focus="activeWindow = { source: 'ranking', id: instance.id }"
        @close="removeRankingInstance(instance.id)"
      />
    </template>
    <template #evaluationSerialisation="{ onHighlight }">
      <WindowSerialisation
        v-for="(instance, index) in layoutMode === 'regular' ? serialisationInstances : []"
        :key="instance.id"
        :input="evaluationInput"
        :instance-state="instance"
        :instance-offset="index"
        :document-id="documentId"
        :state-key="`${instance.id}:window`"
        :suppressed="isSuppressed('serialisation', instance.id)"
        @update:instance-state="updateSerialisationInstance($event)"
        @highlight="onHighlight"
        @focus="activeWindow = { source: 'serialisation', id: instance.id }"
        @close="removeSerialisationInstance(instance.id, onHighlight)"
      />
    </template>
  </GraphEditor>
</template>
