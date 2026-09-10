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
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import { computed, inject, provide, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { abstractArgumentationGlossary } from '@/modules/abstract-argumentation/glossary'
import type { ArgumentId } from '@/modules/common/argumentation/model'
import { DOCUMENTS_DB_INJECTION_KEY } from '@/modules/common/documents/db'
import { useDocumentUIState } from '@/modules/common/documents/uiState'
import EvaluationHost, { type EvaluationChip } from '@/modules/common/evaluation/EvaluationHost.vue'
import type { Input } from '@/modules/common/evaluation/types'
import type { ExportFileData } from '@/modules/common/export'
import { WindowExport } from '@/modules/common/export/WindowExportAsync'
import {
  type GraphEditorStateLink,
  type GraphEditorStateNode,
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
  createDefaultPafWindowInstance,
  type PafWindowInstanceState,
} from '@/modules/probabilistic-argumentation/evaluation/extensionWindowState'
import { availableExports } from '@/modules/probabilistic-argumentation/export'
import { probabilisticArgumentationGlossary } from '@/modules/probabilistic-argumentation/glossary'
import type {
  PafArgumentData,
  ProbabilisticArgumentation,
} from '@/modules/probabilistic-argumentation/model'
import ProbabilityEditor from '@/modules/probabilistic-argumentation/ProbabilityEditor.vue'
import { pafBasicsTutorial } from '@/modules/probabilistic-argumentation/tutorials/paf-basics'
import { pafEvaluationTutorial } from '@/modules/probabilistic-argumentation/tutorials/paf-evaluation'
import WindowExtensions from '@/modules/probabilistic-argumentation/WindowExtensions.vue'

// This wrapper's root is a <div> (the graph editor and the probability sheet are
// siblings), so shell-provided attrs like document-name / type-badge / @home would
// otherwise fall through to that div instead of the inner GraphEditor.
defineOptions({ inheritAttrs: false })

const { state, historyState, documentId } = defineProps<{
  state: DocumentState<ProbabilisticArgumentation<PafArgumentData>>
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
  generate: []
  change: [state: DocumentState<ProbabilisticArgumentation<PafArgumentData>>]
  undo: []
  redo: []
  save: []
  share: []
  export: [filedata: ExportFileData]
}>()

const evaluationInput = computed<Input<ProbabilisticArgumentation<PafArgumentData>>>(() => ({
  stateId: state.stateId,
  content: state.current.content,
}))

const renderedState = shallowRef(state)
const editorState = shallowRef(transformToEditorState(state, true))
const isProbabilitiesOpen = ref(false)
// Compact: which row the Probabilities sheet should jump to after a node/attack tap.
const probabilityFocusKey = ref<string | undefined>(undefined)
watch(isProbabilitiesOpen, (isOpen) => {
  if (!isOpen) probabilityFocusKey.value = undefined
})

watch(
  () => state,
  () => {
    if (state.stateId === renderedState.value.stateId) return
    renderedState.value = state
    editorState.value = transformToEditorState(state, true)
  },
)

function transformToEditorState(
  state: DocumentState<ProbabilisticArgumentation<PafArgumentData>>,
  redraw: boolean,
) {
  const argumentation = state.current.content
  const nodes: GraphEditorStateNode[] = [...argumentation.arguments()].map(([id, data]) => ({
    id,
    label: data.name,
    x: data.x,
    y: data.y,
  }))
  const links: GraphEditorStateLink[] = [...argumentation.attacks()].map(
    ([sourceId, targetId]) => ({ sourceId, targetId, type: LinkType.SINGLE }),
  )
  return { stateId: state.stateId, nodes, links, redraw }
}

const { t } = useI18n({ useScope: 'global' })

const linkConfig = computed(() => ({
  SINGLE: { displayName: t('editor.links.attack') },
}))

function createNewState(recipe: (draft: ProbabilisticArgumentation<PafArgumentData>) => void) {
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
  const argumentData: PafArgumentData = {
    name: data.label,
    x: data.x,
    y: data.y,
    probability: 1,
  }
  createNewState((draft) => draft.addArgument(data.id, argumentData))
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

function onLinkCreated(data: { sourceId: NodeId; targetId: NodeId }) {
  createNewState((draft) => draft.addAttack(data.sourceId, data.targetId, 1))
}

function onLinkDeleted(data: { sourceId: NodeId; targetId: NodeId }) {
  createNewState((draft) => draft.deleteAttack(data.sourceId, data.targetId))
}

function onChangeArgumentProbability(id: number, probability: number) {
  createNewState((draft) => {
    draft.getArgument(id).probability = probability
  })
  probabilityEditCount.value++
}

function onChangeAttackProbability(sourceId: number, targetId: number, probability: number) {
  createNewState((draft) => draft.addAttack(sourceId, targetId, probability))
  probabilityEditCount.value++
}

// ── Attack probability overlay labels ───────────────────────────────────────
// Argument-level probability is rendered as a native library annotation (see
// argumentAnnotations below) - only edge-anchored attack probability still uses this
// overlay path, since edge-relative annotation positioning isn't part of the library yet.

interface ProbabilityLabel {
  key: string
  x: number
  y: number
  value: number
  type: 'argument' | 'attack'
  id?: number
  sourceId?: number
  targetId?: number
}

const MUTUAL_ATTACK_LABEL_OFFSET = 12

function getAttackProbabilityLabels(nodes: GraphEditorStateNode[]): ProbabilityLabel[] {
  const positions = new Map(nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
  const labels: ProbabilityLabel[] = []

  const attackSet = new Set<string>()
  for (const [sourceId, targetId] of renderedState.value.current.content.attacks()) {
    attackSet.add(`${sourceId}-${targetId}`)
  }

  for (const [sourceId, targetId, prob] of renderedState.value.current.content.attacks()) {
    if (sourceId === targetId) continue
    const source = positions.get(sourceId)
    const target = positions.get(targetId)
    if (source === undefined || target === undefined) continue

    let offsetX = 0
    let offsetY = 0

    if (attackSet.has(`${targetId}-${sourceId}`)) {
      const [canonSrcId, canonTgtId] =
        sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId]
      const canonSrc = positions.get(canonSrcId)!
      const canonTgt = positions.get(canonTgtId)!
      const dx = canonTgt.x - canonSrc.x
      const dy = canonTgt.y - canonSrc.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len > 0) {
        const sign = sourceId < targetId ? 1 : -1
        offsetX = (-dy / len) * MUTUAL_ATTACK_LABEL_OFFSET * sign
        offsetY = (dx / len) * MUTUAL_ATTACK_LABEL_OFFSET * sign
      }
    }

    labels.push({
      key: `atk-${sourceId}-${targetId}`,
      x: (source.x + target.x) / 2 + offsetX,
      y: (source.y + target.y) / 2 + offsetY,
      value: prob,
      type: 'attack',
      sourceId,
      targetId,
    })
  }

  return labels
}

// ── Argument probability annotation ─────────────────────────────────────────

const argumentAnnotations = computed(() => {
  const annotations = new Map<NodeId, { content: string; position?: AnnotationPosition }>()
  for (const [id, data] of renderedState.value.current.content.arguments()) {
    annotations.set(id, {
      content: data.probability.toFixed(2),
      position: data.probabilityAnnotationPosition,
    })
  }
  return annotations
})

function onAnnotationClicked(data: { id: NodeId; content: string }, event: PointerEvent) {
  event.stopPropagation()
  // Compact: jump to the argument's row in the Probabilities sheet instead of the
  // desktop inline slider popup, which has no thumb-reachable place to sit.
  if (layoutMode.value === 'compact') {
    probabilityFocusKey.value = `arg-${data.id}`
    isProbabilitiesOpen.value = true
    return
  }
  editingLabel.value = {
    key: `arg-${data.id}`,
    x: 0,
    y: 0,
    value: parseFloat(data.content),
    type: 'argument',
    id: data.id,
    screenX: event.clientX,
    screenY: event.clientY,
  }
  editingValue.value = parseFloat(data.content)
}

function onAnnotationMoved(data: { id: NodeId; position: AnnotationPosition }[]) {
  createNewState((draft) => {
    for (const { id, position } of data) {
      draft.getArgument(id).probabilityAnnotationPosition = position
    }
  })
}

/** Open the Probabilities sheet focused on one argument or attack row. */
function openProbabilitySheet(focusKey: string) {
  probabilityFocusKey.value = focusKey
  isProbabilitiesOpen.value = true
}

const probabilityAction = (focusKey: string): SelectionAction => ({
  key: 'probability',
  label: t('editor.probabilities.editProbability'),
  icon: AdjustmentsHorizontalIcon,
  run: () => openProbabilitySheet(focusKey),
})

function pafNodeSelectionActions(id: NodeId): SelectionAction[] {
  return [probabilityAction(`arg-${id}`)]
}

function pafEdgeSelectionActions(link: { sourceId: NodeId; targetId: NodeId }): SelectionAction[] {
  return [probabilityAction(`atk-${link.sourceId}-${link.targetId}`)]
}

// ── Evaluation window management ───────────────────────────────────────────

const nodeWeights = shallowRef<Map<ArgumentId, number>>(new Map())

function onSetWeights(weights: Array<{ id: ArgumentId; weight: number }>) {
  nodeWeights.value = new Map(weights.map(({ id, weight }) => [id, weight]))
}

const evaluationInstances = useDocumentUIState<PafWindowInstanceState[]>(
  db,
  documentId,
  'evaluation-instances',
  [],
)

function addEvaluationInstance() {
  evaluationInstances.value = [...evaluationInstances.value, createDefaultPafWindowInstance()]
}

function removeEvaluationInstance(id: string) {
  if (evaluationInstances.value.length === 1) nodeWeights.value = new Map()
  evaluationInstances.value = evaluationInstances.value.filter((i) => i.id !== id)
}

function updateEvaluationInstance(updated: PafWindowInstanceState) {
  evaluationInstances.value = evaluationInstances.value.map((i) =>
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
  evaluationInstances.value.map((i) => ({
    id: i.id,
    label: evaluationTitles.value[i.id] ?? i.semanticKey,
    kind: 'extension',
  })),
)

// The node weights come from the active config only; clear them when the sheet closes.
watch(evaluationHostOpen, (isOpen) => {
  if (!isOpen && layoutMode.value === 'compact') nodeWeights.value = new Map()
})

provide(TOOLTIP_REGISTRY_KEY, {
  ...abstractArgumentationGlossary,
  ...probabilisticArgumentationGlossary,
})

const pafTutorials = [pafBasicsTutorial, pafEvaluationTutorial, ...commonTutorials]

const probabilityButtonRef = useTemplateRef<HTMLElement>('probabilityButton')
const probabilityEditCount = ref(0)
const evaluationCount = ref(0)

const tutorialContextExtra = computed(() => ({
  isExtensionWindowOpen: evaluationInstances.value.length > 0,
  evaluationWindowCount: evaluationInstances.value.length,
  evaluationCount: evaluationCount.value,
  probabilityEditCount: probabilityEditCount.value,
}))

const tutorialRefs = computed(() => ({
  probabilityButton: probabilityButtonRef.value ?? null,
}))

// ── Inline editing popup ────────────────────────────────────────────────────

const editingLabel = shallowRef<(ProbabilityLabel & { screenX: number; screenY: number }) | null>(
  null,
)
const editingValue = ref(0)

function openEditor(event: MouseEvent, label: ProbabilityLabel) {
  event.stopPropagation()
  if (layoutMode.value === 'compact') {
    probabilityFocusKey.value =
      label.type === 'attack' ? `atk-${label.sourceId}-${label.targetId}` : `arg-${label.id}`
    isProbabilitiesOpen.value = true
    return
  }
  editingLabel.value = { ...label, screenX: event.clientX, screenY: event.clientY }
  editingValue.value = label.value
}

function applyEdit(value: number) {
  const clamped = Math.max(0, Math.min(1, value))
  editingValue.value = clamped
  const lbl = editingLabel.value
  if (lbl === null) return
  if (lbl.type === 'argument') {
    if (lbl.id !== undefined) onChangeArgumentProbability(lbl.id, clamped)
  } else {
    if (lbl.sourceId !== undefined && lbl.targetId !== undefined)
      onChangeAttackProbability(lbl.sourceId, lbl.targetId, clamped)
  }
}

function closeEditor() {
  editingLabel.value = null
}

function onPopupKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeEditor()
}
</script>

<template>
  <div class="h-full w-full relative">
    <GraphEditor
      v-if="editorState"
      v-bind="$attrs"
      class="paf-graph"
      :document-id="documentId"
      @new="emit('new')"
      @load="emit('load')"
      @generate="emit('generate')"
      @node-created="onNodeCreated"
      @node-deleted="onNodeDeleted"
      @node-label-edited="onNodeLabelEdited"
      @nodes-moved="onNodesMoved"
      @link-created="onLinkCreated"
      @link-deleted="onLinkDeleted"
      @annotation-clicked="onAnnotationClicked"
      @annotation-moved="onAnnotationMoved"
      :link-configs="linkConfig"
      node-tap-action="Open its probability"
      :node-selection-actions="pafNodeSelectionActions"
      :edge-selection-actions="pafEdgeSelectionActions"
      :state="editorState"
      :node-weights="nodeWeights"
      :node-annotations="argumentAnnotations"
      :history-state="historyState"
      :tutorials="pafTutorials"
      default-tutorial-id="paf-basics"
      :tutorial-context-extra="tutorialContextExtra"
      :tutorial-refs="tutorialRefs"
      @undo="emit('undo')"
      @redo="emit('redo')"
      @save="emit('save')"
      @share="emit('share')"
      v-model:evaluation-open="evaluationHostOpen"
      @open-extension-window="addEvaluationInstance()"
    >
      <template #evaluationExtensions>
        <!-- Compact: one host sheet with a chip switcher over all saved configs. -->
        <EvaluationHost
          v-if="layoutMode === 'compact'"
          v-model:open="evaluationHostOpen"
          v-model:active-id="activeExtensionId"
          :chips="extensionChips"
          @add="addEvaluationInstance()"
          @remove="removeEvaluationInstance($event)"
        >
          <template #default="{ activeId }">
            <WindowExtensions
              v-for="instance in evaluationInstances"
              v-show="instance.id === activeId"
              :key="instance.id"
              hosted
              :input="evaluationInput"
              :instance-state="instance"
              :document-id="documentId"
              :state-key="`${instance.id}:window`"
              :suppressed="instance.id !== activeId"
              @update:instance-state="updateEvaluationInstance($event)"
              @title="setEvaluationTitle(instance.id, $event)"
              @set-weights="(w) => instance.id === activeId && onSetWeights(w)"
              @evaluate="evaluationCount++"
            />
          </template>
        </EvaluationHost>

        <!-- Regular: one floating window per saved config. -->
        <WindowExtensions
          v-for="(instance, index) in evaluationInstances"
          v-else
          :key="instance.id"
          :input="evaluationInput"
          :instance-state="instance"
          :instance-offset="index"
          :document-id="documentId"
          :state-key="`${instance.id}:window`"
          @update:instance-state="updateEvaluationInstance($event)"
          @set-weights="onSetWeights"
          @evaluate="evaluationCount++"
          @close="removeEvaluationInstance(instance.id)"
        />
      </template>

      <template #toolbar>
        <button
          ref="probabilityButton"
          class="btn btn-square btn-sm"
          :class="{ 'btn-active': isProbabilitiesOpen }"
          :title="t('editor.probabilities.title')"
          @click="isProbabilitiesOpen = !isProbabilitiesOpen"
        >
          <AdjustmentsHorizontalIcon class="size-6 opacity-70" />
        </button>
      </template>

      <template #nodeOverlay="{ nodes }">
        <text
          v-for="label in getAttackProbabilityLabels(nodes)"
          :key="label.key"
          :x="label.x"
          :y="label.y"
          text-anchor="middle"
          dominant-baseline="central"
          font-size="10"
          font-family="monospace"
          stroke="white"
          stroke-width="3"
          paint-order="stroke fill"
          style="pointer-events: all; cursor: pointer"
          @click="openEditor($event, label)"
          >{{ label.value.toFixed(2) }}</text
        >
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

    <ProbabilityEditor
      v-model:open="isProbabilitiesOpen"
      :input="evaluationInput"
      :document-id="documentId"
      state-key="probabilities:window"
      :focus-key="probabilityFocusKey"
      @change-argument-probability="onChangeArgumentProbability"
      @change-attack-probability="onChangeAttackProbability"
    />

    <Teleport to="body">
      <template v-if="editingLabel !== null">
        <div class="fixed inset-0 z-40" @click="closeEditor" @keydown="onPopupKeydown" />
        <div
          class="fixed z-50 bg-base-100 border border-base-300 rounded-lg shadow-xl p-3 flex flex-col gap-2 w-48"
          :style="{ left: `${editingLabel.screenX + 8}px`, top: `${editingLabel.screenY + 8}px` }"
          @click.stop
          @keydown="onPopupKeydown"
        >
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="range range-xs"
            :value="editingValue"
            @input="applyEdit(parseFloat(($event.target as HTMLInputElement).value))"
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            class="input input-xs w-full text-right font-mono"
            :value="editingValue"
            @change="applyEdit(parseFloat(($event.target as HTMLInputElement).value))"
          />
        </div>
      </template>
    </Teleport>
  </div>
</template>
