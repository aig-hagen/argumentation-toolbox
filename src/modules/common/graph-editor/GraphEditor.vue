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
  type AnnotationPosition,
  type AnnotationPositionSnapshot,
  ArrowType,
  EVENT_CAUSE,
  GraphComponent,
  type jsonHyperLink,
  type jsonLink,
  type jsonNode,
  NodeOutline,
  NodeShape,
  type PositionSnapshot,
  type SelectionTarget,
} from '@aig-hagen/graph-component/lib'
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowLongRightIcon,
  ArrowsPointingInIcon,
  ArrowsRightLeftIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3Icon,
  BookOpenIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  DocumentPlusIcon,
  FolderOpenIcon,
  MinusCircleIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlayIcon,
  PlusCircleIcon,
  QuestionMarkCircleIcon,
  ShareIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { useDebounceFn, useElementVisibility, useMediaQuery } from '@vueuse/core'
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  provide,
  ref,
  shallowReactive,
  shallowRef,
  toRef,
  useId,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'

import { ARGUMENT_RADIUS_IN_PX } from '@/modules/common/argumentation/model'
import { DOCUMENTS_DB_INJECTION_KEY } from '@/modules/common/documents/db'
import { getUIStateValue, setUIStateValue } from '@/modules/common/documents/uiState'
import { serializeGraphSvg } from '@/modules/common/export/renderGraphSvg'
import ArrowDoubleLongRightIcon from '@/modules/common/graph-editor/ArrowDoubleLongRightIcon.vue'
import {
  GRAPH_EDITOR_LAYOUTS,
  GRAPH_SVG_RENDERER_KEY,
  type GraphEditorCommands,
  type GraphEditorState,
  type Highlight,
  type HistoryState,
  type LinkConfigs,
  LinkType,
  type NodeId,
  type SelectionAction,
  SHEET_REFIT_KEY,
  TUTORIAL_COLLAPSE_KEY,
  TUTORIAL_REF_REGISTRY_KEY,
  TUTORIAL_REFIT_KEY,
} from '@/modules/common/graph-editor/graphEditor'
import {
  adjustNodeLabelFontSize,
  parseHyperLinkId,
  parseLinkId,
  startNodeLabelEdit,
} from '@/modules/common/graph-editor/graphEditorUtils'
import {
  GRAPH_STYLE_DARK,
  GRAPH_STYLE_DEFAULT,
  GRAPH_STYLE_HIGH_CONTRAST,
  GRAPH_STYLE_LIBRARY,
  GRAPH_STYLE_MINIMAL,
  type GraphStyle,
} from '@/modules/common/graph-editor/graphStyle'
import { getNodePositions, prefetchGraphviz } from '@/modules/common/graph-editor/layouting'
import ArrowSwitcher from '@/modules/common/graph-editor/LinkTypeSwitch.vue'
import SelectionActionBar from '@/modules/common/graph-editor/SelectionActionBar.vue'
import SerialisationIcon from '@/modules/common/graph-editor/SerialisationIcon.vue'
import SigmaIcon from '@/modules/common/graph-editor/SigmaIcon.vue'
import SucceqIcon from '@/modules/common/graph-editor/SucceqIcon.vue'
import { useHighlight } from '@/modules/common/graph-editor/useHighlight'
import { usePhysics } from '@/modules/common/graph-editor/usePhysics'
import HelpControls from '@/modules/common/help/HelpControls.vue'
import WindowHelp from '@/modules/common/help/WindowHelp.vue'
import { IdGenerator, IdMapping } from '@/modules/common/ids'
import { useLayoutMode } from '@/modules/common/layout/useLayoutMode'
import { Layout, layoutDatas } from '@/modules/common/main-menu/layouting'
import MainMenu from '@/modules/common/main-menu/MainMenu.vue'
import { EntryState, type GridVisibility } from '@/modules/common/main-menu/types'
import { getNextName } from '@/modules/common/nextName'
import SettingsContent from '@/modules/common/settings/SettingsContent.vue'
import { useSettings } from '@/modules/common/settings/useSettings'
import WindowSettings from '@/modules/common/settings/WindowSettings.vue'
import {
  isShortcut,
  TOGGLE_GRID_SHORTCUT,
  TOGGLE_PHYSICS_SHORTCUT,
} from '@/modules/common/shortcuts'
import { useTheme } from '@/modules/common/theme/useTheme'
import TutorialOverlay from '@/modules/common/tutorial/TutorialOverlay.vue'
import TutorialOverlayMobile from '@/modules/common/tutorial/TutorialOverlayMobile.vue'
import type { Tutorial, TutorialContext } from '@/modules/common/tutorial/types'
import { TUTORIAL_INSTANCE_KEY, useTutorial } from '@/modules/common/tutorial/useTutorial'
import WindowTutorials from '@/modules/common/tutorial/WindowTutorials.vue'
import BottomSheet from '@/modules/common/window/BottomSheet.vue'

// The `GraphComponent` is implemented in away,
// that each instance needs an ID
// if multiple instances are used on the same site.
const graphComponentId = useId()
provide(TUTORIAL_INSTANCE_KEY, graphComponentId)
const graphComponentRef = useTemplateRef('graph-component')
const containerRef = useTemplateRef<HTMLDivElement>('container')
const overlayGroupRef = useTemplateRef<SVGGElement>('overlay-group')

// --- Contextual action bar (new pointer interaction model) ------------------------------
// The graph-component emits a clean tap-not-drag `select`; the shared editor owns the bar
// shell and the common actions. Only active while `gestureBindingsEnabled` is on.
const selection = shallowRef<SelectionTarget | null>(null)

function onSelect(next: SelectionTarget | null) {
  selection.value = next
}

// --- Collective-attack source set (touch) -----------------------------------------------
// On touch there is no shift-click to build a hyperlink source set. We drive it from the
// action bar's Add/Remove-to-attack button and mirror the library's set here (internal ids)
// to render the pending-set pill. Only meaningful when `allowHyperLinkCreation` is on (SetAF).
const hyperLinkSources = shallowRef<number[]>([])

function onHyperLinkSourcesChanged(ids: number[]) {
  hyperLinkSources.value = ids
}

/** Live client-space box of the selected element, for anchoring the floating bar. */
function selectionReferenceRect(): DOMRect | null {
  const sel = selection.value
  if (sel === null) return null
  const anchor = graphComponentRef.value?.getElementAnchor(sel.kind, sel.id)
  const host = containerRef.value?.querySelector('.graph-controller__graph-host')
  if (anchor === undefined || !host) return null
  const h = host.getBoundingClientRect()
  return new DOMRect(h.left + anchor.x, h.top + anchor.y, anchor.width, anchor.height)
}

function onSelectionRename() {
  const sel = selection.value
  if (sel === null || sel.kind !== 'node') return
  graphComponentRef.value?.editNodeLabel(sel.id as number)
  // The library only focuses the label input; preselect its text so the user can
  // type over the current name immediately (matches desktop double-click behaviour).
  const input = containerRef.value?.querySelector<HTMLInputElement>('#node-label-input-field')
  input?.select()
  selection.value = null
}

function onSelectionDelete() {
  const sel = selection.value
  if (sel === null) return
  if (sel.kind === 'node' && idMapping.has(sel.id as number)) {
    // Mirror the user-gesture delete: drop the node from the id map, remove it from the
    // library view, then tell the module to delete the argument from the document (which
    // re-renders and rebuilds the id map). Going through deleteElement alone emits a
    // PROGRAMMATIC event that onNodeDeleted ignores, leaving idMapping stale (physics crash).
    const publicId = idMapping.delete(sel.id as number)
    graphComponentRef.value?.deleteElement(sel.id)
    emit('nodeDeleted', { id: publicId })
    triggerSettle()
  } else if (sel.kind === 'edge') {
    // Same reason as nodes: deleteElement alone emits a PROGRAMMATIC linkDeleted that
    // onLinkDeleted ignores, so drive the document deletion ourselves.
    const { sourceId, targetId } = parseLinkId(sel.id as string)
    graphComponentRef.value?.deleteElement(sel.id)
    if (idMapping.has(sourceId) && idMapping.has(targetId)) {
      emit('linkDeleted', {
        sourceId: idMapping.getOrFail(sourceId),
        targetId: idMapping.getOrFail(targetId),
      })
    }
    triggerSettle()
  } else {
    graphComponentRef.value?.deleteElement(sel.id)
  }
  selection.value = null
}

/** Public source/target of an internal link id, or `undefined` if its endpoints are unmapped. */
function edgePublicEndpoints(internalLinkId: string) {
  const { sourceId, targetId } = parseLinkId(internalLinkId)
  if (!idMapping.has(sourceId) || !idMapping.has(targetId)) return undefined
  return { sourceId: idMapping.getOrFail(sourceId), targetId: idMapping.getOrFail(targetId) }
}

function currentLinkType(internalLinkId: string): LinkType | undefined {
  const ends = edgePublicEndpoints(internalLinkId)
  if (ends === undefined) return undefined
  return state.links.find((l) => l.sourceId === ends.sourceId && l.targetId === ends.targetId)?.type
}

/**
 * The action-bar buttons for the current selection: common actions (Rename for nodes), the
 * generic edge type-switch, module-contributed domain actions, and Delete (far right, danger).
 */
const selectionActions = computed<SelectionAction[]>(() => {
  const sel = selection.value
  if (sel === null) return []
  const actions: SelectionAction[] = []
  if (sel.kind === 'node') {
    // Collective-attack source toggle (touch alternative to the desktop shift-click). Kept
    // before Rename; dismisses the bar on tap — the library keeps its own source highlight on
    // the node, so the pending set stays visible across the taps that build it.
    if (allowHyperLinkCreation && layoutMode.value === 'compact') {
      const inSet = hyperLinkSources.value.includes(sel.id as number)
      actions.push({
        key: 'attack-source',
        label: inSet ? 'Remove from attack' : 'Add to attack',
        icon: inSet ? MinusCircleIcon : PlusCircleIcon,
        run: () => graphComponentRef.value?.toggleHyperLinkSource(sel.id as number),
      })
    }
    actions.push({ key: 'rename', label: 'Rename', icon: PencilSquareIcon, run: onSelectionRename })
    if (nodeSelectionActions && idMapping.has(sel.id as number)) {
      actions.push(...nodeSelectionActions(idMapping.getOrFail(sel.id as number)))
    }
  } else if (sel.kind === 'edge') {
    const internalId = sel.id as string
    const keys = Object.keys(linkConfigs) as LinkType[]
    if (enableLinkSwitching && keys.length > 0) {
      const current = currentLinkType(internalId)
      const next = keys[((current ? keys.indexOf(current) : -1) + 1) % keys.length]!
      const nextName = linkConfigs[next]?.displayName ?? 'type'
      actions.push({
        key: 'switch-type',
        label: `Switch to ${nextName}`,
        icon: ArrowsRightLeftIcon,
        // In-place switcher: stay open so the user can cycle types across taps.
        keepOpen: true,
        run: () => updateLinkType(internalId, next),
      })
    }
    const ends = edgePublicEndpoints(internalId)
    const type = currentLinkType(internalId) ?? keys[0]
    if (edgeSelectionActions && ends !== undefined && type !== undefined) {
      actions.push(...edgeSelectionActions({ ...ends, type }))
    }
  }
  actions.push({
    key: 'delete',
    label: 'Delete',
    icon: TrashIcon,
    danger: true,
    run: onSelectionDelete,
  })
  return actions
})

// WYSIWYG SVG export: serialize the live graph canvas on demand. Injected by the export UI so
// it can offer an SVG format that works on any device (no TikZ/WebAssembly). Returns null when
// the canvas isn't mounted or has no content to render.
provide(GRAPH_SVG_RENDERER_KEY, () => {
  const canvas = containerRef.value?.querySelector(
    '.graph-controller__graph-canvas',
  ) as SVGSVGElement | null
  return canvas ? serializeGraphSvg(canvas) : null
})

const {
  state,
  linkConfigs,
  historyState,
  nodeWeights,
  nodeOutlines,
  nodeAnnotations,
  graphStyle,
  allowLinkCreation = true,
  allowLinkDeletion = true,
  allowHyperLinkCreation = false,
  tutorials,
  defaultTutorialId,
  tutorialContextExtra,
  tutorialRefs,
  documentId,
  documentName,
  typeBadge,
  nodeTapAction,
  nodeSelectionActions,
  edgeSelectionActions,
} = defineProps<{
  state: GraphEditorState
  linkConfigs: LinkConfigs
  historyState: HistoryState
  nodeWeights?: Map<NodeId, number>
  nodeOutlines?: Map<NodeId, NodeOutline>
  nodeAnnotations?: Map<NodeId, { content: string; position?: AnnotationPosition }>
  graphStyle?: GraphStyle
  allowLinkCreation?: boolean
  allowLinkDeletion?: boolean
  allowHyperLinkCreation?: boolean
  tutorials?: Tutorial[]
  defaultTutorialId?: string
  tutorialContextExtra?: Partial<TutorialContext>
  tutorialRefs?: Record<string, HTMLElement | null>
  documentId: number
  /** Compact chrome only: the open document's name, shown in the switcher chip. */
  documentName?: string
  /** Compact chrome only: short module badge (e.g. `AF`) shown in the switcher chip. */
  typeBadge?: string
  /** Full node-tap description for the Help sheet (see the primary-action table).
      Defaults to `Rename it`. */
  nodeTapAction?: string
  /** Module-contributed action-bar buttons for a selected node (public id), e.g. iAF
      certainty toggle, ADF condition, PAF probability. Merged after the common Rename. */
  nodeSelectionActions?: (id: NodeId) => SelectionAction[]
  /** Module-contributed action-bar buttons for a selected edge (public source/target/type),
      e.g. PAF edge probability. Merged after the generic type-switch. */
  edgeSelectionActions?: (link: {
    sourceId: NodeId
    targetId: NodeId
    type: LinkType
  }) => SelectionAction[]
}>()

const db = inject(DOCUMENTS_DB_INJECTION_KEY)
if (db === undefined) {
  throw new Error('Documents database not provided.')
}

const { t } = useI18n({ useScope: 'global' })
const { isDark } = useTheme()
const {
  graphStyle: graphStyleSetting,
  defaultShowGrid,
  defaultGridType,
  gridCellScale,
  snapMode,
  showHints,
} = useSettings()
const effectiveStyle = computed<GraphStyle>(() => {
  if (graphStyle !== undefined) return graphStyle
  switch (graphStyleSetting.value) {
    case 'high-contrast':
      return GRAPH_STYLE_HIGH_CONTRAST
    case 'minimal':
      return GRAPH_STYLE_MINIMAL
    case 'library':
      return GRAPH_STYLE_LIBRARY
    default:
      return isDark.value ? GRAPH_STYLE_DARK : GRAPH_STYLE_DEFAULT
  }
})

const linkNames = computed(() =>
  Object.values(linkConfigs).map((config) => config.displayName.toLocaleLowerCase()),
)
const isExportOpened = ref<boolean>(false)
// Latches on first open so the (async) export window mounts lazily, then stays mounted
// so its close animation still plays. See the `#export` slot consumers.
const hasExportBeenOpened = ref<boolean>(false)
const isHelpOpened = ref<boolean>(false)
const isTutorialWindowOpen = ref<boolean>(false)

const tutorialMoveCount = ref(0)
const tutorialLinkTypeSwitchCount = ref(0)
const tutorialRenameCount = ref(0)
const tutorialRelayoutCount = ref(0)
const tutorialParamsCollapseCount = ref(0)
const tutorialPanCount = ref(0)
const tutorialZoomCount = ref(0)
const tutorialCenterCount = ref(0)
const tutorialPhysicsToggleCount = ref(0)
const tutorialGridToggleCount = ref(0)
const tutorialCtrlSnapCount = ref(0)

const tutorialContext = computed<TutorialContext>(() => ({
  nodeCount: state.nodes.length,
  linkCount: state.links.length,
  hyperLinkCount: state.hyperLinks?.length ?? 0,
  canUndo: historyState.canUndo,
  canRedo: historyState.canRedo,
  uncertainNodeCount: tutorialContextExtra?.uncertainNodeCount ?? 0,
  uncertainLinkCount: tutorialContextExtra?.uncertainLinkCount ?? 0,
  isExtensionWindowOpen: tutorialContextExtra?.isExtensionWindowOpen ?? false,
  evaluationWindowCount: tutorialContextExtra?.evaluationWindowCount ?? 0,
  evaluationCount: tutorialContextExtra?.evaluationCount ?? 0,
  highlightCount: tutorialContextExtra?.highlightCount ?? 0,
  semanticsInteractCount: tutorialContextExtra?.semanticsInteractCount ?? 0,
  modeInteractCount: tutorialContextExtra?.modeInteractCount ?? 0,
  paramsCollapseCount: tutorialParamsCollapseCount.value,
  conditionEditCount: tutorialContextExtra?.conditionEditCount ?? 0,
  conditionEditorOpenCount: tutorialContextExtra?.conditionEditorOpenCount ?? 0,
  probabilityEditCount: tutorialContextExtra?.probabilityEditCount ?? 0,
  moveCount: tutorialMoveCount.value,
  linkTypeSwitchCount: tutorialLinkTypeSwitchCount.value,
  renameCount: tutorialRenameCount.value,
  relayoutCount: tutorialRelayoutCount.value,
  panCount: tutorialPanCount.value,
  zoomCount: tutorialZoomCount.value,
  centerCount: tutorialCenterCount.value,
  physicsToggleCount: tutorialPhysicsToggleCount.value,
  gridToggleCount: tutorialGridToggleCount.value,
  ctrlSnapCount: tutorialCtrlSnapCount.value,
  isExportOpened: isExportOpened.value,
}))

const { startTutorial, autoStartedTutorials, isTutorialDone, isActive } = useTutorial()

// Tutorial refs registered by controls deep inside evaluation windows/sheets (semantics/mode
// selectors), merged into the refs maps below so the overlay can spotlight them. A reactive map
// mutated by property so the setter never *reads* it — reading here would let a caller's
// watchEffect track this map and re-trigger itself in a loop.
const dynamicTutorialRefs = shallowReactive<Record<string, HTMLElement | null>>({})
// Shared evaluation components report parameter-panel collapses here, so every module's
// evaluation tutorial can advance its collapse step on action without per-module wiring.
provide(TUTORIAL_COLLAPSE_KEY, () => tutorialParamsCollapseCount.value++)
provide(TUTORIAL_REF_REGISTRY_KEY, (key: string, el: HTMLElement | null) => {
  if (el) dynamicTutorialRefs[key] = el
  else delete dynamicTutorialRefs[key]
})

function autoStartTutorial(id: string | undefined) {
  if (!id || !showHints.value || isActive.value) return
  if (autoStartedTutorials.value.includes(id) || isTutorialDone(id)) return
  const tutorial = tutorials?.find((t) => t.id === id)
  if (!tutorial) return
  if (tutorial.desktopOnly && isTouchDevice.value) return
  autoStartedTutorials.value = [...autoStartedTutorials.value, id]
  startTutorial(tutorial, tutorialContext.value, graphComponentId)
}

watch(isExportOpened, (opened) => {
  if (opened) {
    hasExportBeenOpened.value = true
    autoStartTutorial('editor-export')
  }
})

// Opening an evaluation window/sheet kicks off the module's evaluation tutorial (its own
// open step then auto-advances, since the window is already open).
watch(
  () => tutorialContext.value.isExtensionWindowOpen,
  (open) => {
    if (open) autoStartTutorial(tutorials?.find((t) => t.id.endsWith('-evaluation'))?.id)
  },
)

const slots = useSlots()
const hasRankingSlot = computed(() => !!slots.evaluationRanking)
const hasSerialisationSlot = computed(() => !!slots.evaluationSerialisation)

const enableLinkSwitching = Object.keys(linkConfigs).length > 1
const defaultLinkType = (Object.keys(linkConfigs) as LinkType[])[0]
if (defaultLinkType === undefined) {
  throw Error('At least one link type must be defined.')
}
const selectedLinkType = ref<LinkType>(defaultLinkType)

function renderNewState(state: GraphEditorState, center: boolean) {
  setGraph(state, center)
}

watch(
  () => state,
  () => {
    if (state.redraw) {
      setGraph(state, false)
    }
  },
)

watch(isDark, () => {
  setGraph(state, false)
})

// Opened by the compact Evaluate button; owned by the module so its evaluation host
// (rendered in the module's editor slot) and this button share one open state.
const evaluationOpen = defineModel<boolean>('evaluationOpen', { default: false })

const emit = defineEmits<{
  load: []
  new: []
  generate: []
  nodeCreated: [
    data: {
      id: NodeId
      label: string
      x: number
      y: number
    },
  ]
  nodeDeleted: [
    data: {
      id: NodeId
    },
  ]
  nodeLabelEdited: [
    data: {
      id: NodeId
      label: string
    },
  ]
  nodesMoved: [
    data: {
      id: NodeId
      x: number
      y: number
    }[],
  ]
  linkCreated: [
    data: {
      sourceId: NodeId
      targetId: NodeId
      type: LinkType
    },
  ]
  linkChanged: [
    data: {
      sourceId: NodeId
      targetId: NodeId
      type: LinkType
    },
  ]
  linkDeleted: [
    data: {
      sourceId: NodeId
      targetId: NodeId
    },
  ]
  hyperLinkCreated: [
    data: {
      sourceIds: NodeId[]
      targetId: NodeId
      type: LinkType
    },
  ]
  hyperLinkDeleted: [
    data: {
      sourceIds: NodeId[]
      targetId: NodeId
    },
  ]
  annotationClicked: [
    data: {
      id: NodeId
      content: string
    },
    event: PointerEvent,
  ]
  annotationMoved: [
    data: {
      id: NodeId
      position: AnnotationPosition
    }[],
  ]
  undo: []
  redo: []
  save: []
  share: []
  home: []
  'open-extension-window': []
  'open-ranking-window': []
  'open-serialisation-window': []
}>()

let idGenerator = new IdGenerator()
let idMapping = new IdMapping<number, number>()

const stateRef = toRef(() => state)

const { physicsMode, toggleNodePhysics, triggerSettle, disablePhysics } = usePhysics({
  graphComponentRef,
  getIdMapping: () => idMapping,
  containerRef,
  documentId,
  db,
})
const showGrid = ref<GridVisibility>(defaultShowGrid.value)
const isVisible = useElementVisibility(containerRef)

function toggleGrid() {
  showGrid.value = showGrid.value === 'off' ? 'on' : 'off'
}
const settingsDialog = useTemplateRef<InstanceType<typeof WindowSettings>>('settings-dialog')

function applyGridVisibility(visibility: GridVisibility) {
  const effective = snapMode.value && visibility === 'off' ? 'auto' : visibility
  graphComponentRef.value?.setShowGrid(effective === 'on')
  graphComponentRef.value?.setAutoShowGrid(effective === 'auto')
}
watch(defaultShowGrid, (v) => {
  showGrid.value = v
})
watch(defaultGridType, (type) => {
  graphComponentRef.value?.setGridType(type)
})
watch(graphStyleSetting, () => {
  setGraph(state, false)
})
watch(physicsMode, () => {
  tutorialPhysicsToggleCount.value++
})
watch(showGrid, () => {
  tutorialGridToggleCount.value++
})
watch(showGrid, applyGridVisibility)
watch(gridCellScale, (scale) => {
  graphComponentRef.value?.setGridCellSize(ARGUMENT_RADIUS_IN_PX * scale)
})
watch(snapMode, (enabled) => {
  graphComponentRef.value?.setSnapToGrid(enabled)
  applyGridVisibility(showGrid.value)
})
const { extensionHighlightRef, serialisationHighlightRef } = useHighlight({
  graphComponentRef,
  graphComponentId,
  getIdMapping: () => idMapping,
  stateRef,
  effectiveStyle,
})

function* argumentNames() {
  for (const { label } of state.nodes) {
    yield label
  }
}

function getNextArgumentName() {
  return getNextName(argumentNames())
}

function onNodeCreated(
  node: {
    id: number
    label?: string
    x?: number
    y?: number
  },
  cause: EVENT_CAUSE,
) {
  if (cause === EVENT_CAUSE.PROGRAMMATIC_ACTION) {
    return
  }

  if (node.x === undefined) {
    throw Error('X position is not defined.')
  }

  if (node.y === undefined) {
    throw Error('Y position is not defined.')
  }

  const name = getNextArgumentName()

  const publicId = idGenerator.generate()
  idMapping.add(node.id, publicId)
  const nodeData = {
    id: publicId,
    label: name,
    x: node.x,
    y: node.y,
  }
  emit('nodeCreated', nodeData)
  triggerSettle()
  nextTick(() => {
    graphComponentRef.value!.setLabel(name, node.id)
    graphComponentRef.value!.setColor(effectiveStyle.value.nodeColor, node.id)
    const graphEl = graphComponentRef.value?.$el as Element | undefined
    adjustNodeLabelFontSize(graphEl, graphComponentId, node.id, name)
    startNodeLabelEdit(graphEl, graphComponentId, node.id)
  })
}
function onNodeDeleted(
  node: {
    id: number
    label?: string
    x?: number
    y?: number
  },
  cause: EVENT_CAUSE,
) {
  if (cause === EVENT_CAUSE.PROGRAMMATIC_ACTION) {
    return
  }

  const publicId = idMapping.delete(node.id)
  emit('nodeDeleted', { id: publicId })
  triggerSettle()
}

function onHyperLinkCreated(link: { id: string; label?: string }, cause: EVENT_CAUSE) {
  if (cause === EVENT_CAUSE.PROGRAMMATIC_ACTION) return
  const { sourceIds: internalSourceIds, targetId: internalTargetId } = parseHyperLinkId(link.id)
  const publicSourceIds = internalSourceIds.map((id) => idMapping.getOrFail(id))
  const publicTargetId = idMapping.getOrFail(internalTargetId)
  emit('hyperLinkCreated', {
    sourceIds: publicSourceIds,
    targetId: publicTargetId,
    type: selectedLinkType.value,
  })
  triggerSettle()
  void nextTick(() => {
    const linkColor = linkConfigs[selectedLinkType.value]?.color ?? effectiveStyle.value.linkColor
    graphComponentRef.value!.setColor(linkColor, link.id)
    applyHyperLinkSourceColor(link.id, linkColor)
  })
}

function onHyperLinkDeleted(link: { id: string; label?: string }, cause: EVENT_CAUSE) {
  if (cause === EVENT_CAUSE.PROGRAMMATIC_ACTION) return
  const { sourceIds: internalSourceIds, targetId: internalTargetId } = parseHyperLinkId(link.id)
  if (!internalSourceIds.every((id) => idMapping.has(id)) || !idMapping.has(internalTargetId))
    return
  const publicSourceIds = internalSourceIds.map((id) => idMapping.getOrFail(id))
  const publicTargetId = idMapping.getOrFail(internalTargetId)
  emit('hyperLinkDeleted', { sourceIds: publicSourceIds, targetId: publicTargetId })
  triggerSettle()
}

function openLinkTypeSwitch(link: { id: string; label?: string }, event: PointerEvent) {
  if (event.button !== 0) return
  arrowSwitcherTarget.value = {
    linkId: link.id,
    targetElement: event.currentTarget as SVGElement,
  }
}

function noOp() {}

const onLinkClicked = enableLinkSwitching ? openLinkTypeSwitch : noOp

function onLinkCreated(
  link: {
    id: string
    label?: string
  },
  cause: EVENT_CAUSE,
) {
  if (cause === EVENT_CAUSE.PROGRAMMATIC_ACTION) {
    return
  }
  const { sourceId: internalSourceId, targetId: internalTargetId } = parseLinkId(link.id)
  const publicSourceId = idMapping.getOrFail(internalSourceId)
  const publicTargetId = idMapping.getOrFail(internalTargetId)
  emit('linkCreated', {
    sourceId: publicSourceId,
    targetId: publicTargetId,
    type: selectedLinkType.value,
  })
  triggerSettle()
  void nextTick(() => {
    const linkColor = linkConfigs[selectedLinkType.value]?.color ?? effectiveStyle.value.linkColor
    graphComponentRef.value!.setColor(linkColor, link.id)
    graphComponentRef.value!.setLinkArrowType(toArrowType(selectedLinkType.value), link.id)
    applyLinkDash(link.id, linkConfigs[selectedLinkType.value]?.dashArray)
  })
}

function onLinkDeleted(
  link: {
    id: string
    label?: string
  },
  cause: EVENT_CAUSE,
) {
  if (arrowSwitcherTarget.value?.linkId === link.id) {
    arrowSwitcherTarget.value = undefined
  }
  if (cause === EVENT_CAUSE.PROGRAMMATIC_ACTION) {
    return
  }
  const { sourceId: internalSourceId, targetId: internalTargetId } = parseLinkId(link.id)
  // If mapping does not exist,
  // the link deletion is a cascading result of a node deletion..
  if (!idMapping.has(internalSourceId) || !idMapping.has(internalTargetId)) {
    return
  }
  const publicSourceId = idMapping.getOrFail(internalSourceId)
  const publicTargetId = idMapping.getOrFail(internalTargetId)
  emit('linkDeleted', { sourceId: publicSourceId, targetId: publicTargetId })
  triggerSettle()
}

function onNodesMoved(positions: PositionSnapshot[]) {
  tutorialMoveCount.value++
  const data = positions.map((position) => {
    const internalId = position.nodeId
    const publicId = idMapping.getOrFail(internalId)
    return {
      id: publicId,
      x: position.x,
      y: position.y,
    }
  })
  emit('nodesMoved', data)
}

const VIEWPORT_STATE_KEY = 'viewport'

interface StoredViewport {
  k: number
  x: number
  y: number
}

function applyViewport(viewport: StoredViewport) {
  // Route through the library so its cached transform (used by pointer-to-graph math,
  // e.g. the edge-creation preview) stays in sync — setting the group transform by hand
  // leaves that cache stale and misplaces the preview.
  graphComponentRef.value?.setViewport(viewport.k, viewport.x, viewport.y)
}

const saveViewport = useDebounceFn((viewport: StoredViewport) => {
  void setUIStateValue(db, documentId, VIEWPORT_STATE_KEY, viewport)
}, 400)

function setupZoomAndDragObservers() {
  zoomObserver?.disconnect()
  dragObserver?.disconnect()

  const zoomGroup = containerRef.value?.querySelector(
    '.graph-controller__graph-canvas > g',
  ) as SVGGElement | null
  if (!zoomGroup || !overlayGroupRef.value) return

  let prevTransformScale = 1
  let prevTransformTx = 0
  let prevTransformTy = 0

  const syncTransform = () => {
    const transform = zoomGroup.getAttribute('transform')
    if (overlayGroupRef.value) {
      overlayGroupRef.value.setAttribute('transform', transform ?? '')
    }
    // Track pan vs zoom for tutorial context
    if (transform) {
      const m = /translate\(([^,]+),([^)]+)\)\s*scale\(([^)]+)\)/.exec(transform)
      if (m) {
        const tx = parseFloat(m[1]!)
        const ty = parseFloat(m[2]!)
        const k = parseFloat(m[3]!)
        if (Math.abs(k - prevTransformScale) > 0.001) tutorialZoomCount.value++
        else if (Math.abs(tx - prevTransformTx) > 0.5 || Math.abs(ty - prevTransformTy) > 0.5)
          tutorialPanCount.value++
        prevTransformScale = k
        prevTransformTx = tx
        prevTransformTy = ty
        void saveViewport({ k, x: tx, y: ty })
      }
    }
  }
  syncTransform()
  zoomObserver = new MutationObserver(syncTransform)
  zoomObserver.observe(zoomGroup, { attributes: true, attributeFilter: ['transform'] })

  const nodeIdPrefix = `${graphComponentId}-node-`
  dragObserver = new MutationObserver((mutations) => {
    const updated = new Map(liveNodePositions.value)
    let changed = false
    for (const mutation of mutations) {
      if (mutation.attributeName !== 'transform') continue
      const container = mutation.target as Element
      if (!container.classList.contains('graph-controller__node-container')) continue
      const circle = container.querySelector(`[id^="${nodeIdPrefix}"]`)
      if (!circle) continue
      const domId = circle.getAttribute('id')
      if (!domId) continue
      const internalId = parseInt(domId.slice(nodeIdPrefix.length))
      if (!Number.isFinite(internalId) || !idMapping.has(internalId)) continue
      const publicId = idMapping.getOrFail(internalId)
      const transform = (container as SVGGElement).getAttribute('transform')
      if (!transform) continue
      const match = /translate\(([^,]+),([^)]+)\)/.exec(transform)
      if (!match) continue
      const x = parseFloat(match[1]!)
      const y = parseFloat(match[2]!)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      updated.set(publicId, { x, y })
      changed = true
    }
    if (changed) {
      liveNodePositions.value = updated
    }
  })
  dragObserver.observe(zoomGroup, {
    attributes: true,
    attributeFilter: ['transform'],
    subtree: true,
  })
}

onMounted(() => {
  const graphComponent = graphComponentRef.value
  if (graphComponent === null) {
    throw new Error('Graph component is not rendered.')
  }
  // Warm the graphviz WASM in the background so the first auto-layout doesn't wait on it.
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => prefetchGraphviz())
  } else {
    setTimeout(() => prefetchGraphviz(), 1500)
  }
  graphComponent.toggleZoom(true)
  graphComponent.toggleNodePhysics(false)
  graphComponent.toggleCollisionDetection(false)
  graphComponent.toggleHyperLinkCreationViaGUI(allowHyperLinkCreation)
  graphComponent.setGridCellSize(ARGUMENT_RADIUS_IN_PX * gridCellScale.value)
  graphComponent.setSnapToGrid(snapMode.value)
  graphComponent.setDefaults({
    gestureBindingsEnabled: true,
    interactiveNodeFeedbackEnabled: true,
    nodeAutoGrowToLabelSize: false,
    nodeProps: {
      shape: NodeShape.CIRCLE,
      radius: ARGUMENT_RADIUS_IN_PX,
    },
    allowNodeCreationViaGUI: true,
    allowAnnotationDragging: false,
    nodeGUIEditability: {
      fixedPosition: { x: false, y: false },
      deletable: true,
      labelEditable: true,
      allowIncomingLinks: allowLinkCreation,
      allowOutgoingLinks: allowLinkCreation,
    },
    linkGUIEditability: {
      deletable: allowLinkDeletion,
      labelEditable: false,
    },
  })

  renderNewState(state, true)

  // Restore a previously saved pan/zoom for this document, overriding the auto-centered
  // view above. Applied after the fact (rather than before centering) since the read is
  // async — if there's nothing saved this is a no-op and the auto-centered view stands.
  void getUIStateValue<StoredViewport>(db, documentId, VIEWPORT_STATE_KEY).then((viewport) => {
    if (viewport) applyViewport(viewport)
  })

  setupZoomAndDragObservers()

  // The graph-component host has `touch-action: none` which prevents the browser
  // from generating synthetic dblclick events from double-tap. We detect double-tap
  // in the capture phase (before d3's stopImmediatePropagation can block it) and
  // dispatch a synthetic MouseEvent so the graph's dblclick → createNode path fires.
  const graphHost = containerRef.value?.querySelector<HTMLElement>('.graph-controller__graph-host')
  const svgCanvas = containerRef.value?.querySelector('.graph-controller__graph-canvas')
  if (graphHost && svgCanvas) {
    let lastTap: { time: number; x: number; y: number } | null = null
    const handleDoubleTap = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        lastTap = null
        return
      }
      const touch = event.changedTouches[0]!
      const now = Date.now()
      if (
        lastTap !== null &&
        now - lastTap.time < 300 &&
        Math.hypot(touch.clientX - lastTap.x, touch.clientY - lastTap.y) < 30
      ) {
        // Query fresh — setGraph recreates the SVG element so a captured reference goes stale.
        const currentSvgCanvas = containerRef.value?.querySelector(
          '.graph-controller__graph-canvas',
        )
        currentSvgCanvas?.dispatchEvent(
          new MouseEvent('dblclick', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true,
            cancelable: true,
          }),
        )
        lastTap = null
      } else {
        lastTap = { time: now, x: touch.clientX, y: touch.clientY }
      }
    }
    graphHost.addEventListener('touchstart', handleDoubleTap, { capture: true })
    doubleTapCleanup = () =>
      graphHost.removeEventListener('touchstart', handleDoubleTap, { capture: true })

    const handleMiddleClick = (event: MouseEvent) => {
      if (event.button !== 1) return
      if (
        (event.target as Element)?.closest(
          '.graph-controller__node-container, .graph-controller__link',
        )
      )
        return
      event.preventDefault()
      if (state.nodes.length === 0) return
      if (graphComponentRef.value === null) return

      tutorialCenterCount.value++
      fitToView()
    }
    // Attach to graphHost (not svgCanvas) — setGraph recreates the SVG element so a
    // listener on svgCanvas would be on a detached element after the first redraw.
    graphHost.addEventListener('auxclick', handleMiddleClick)
    middleClickCleanup = () => graphHost.removeEventListener('auxclick', handleMiddleClick)
  }

  const ctrlSnapGraphHost = containerRef.value?.querySelector<HTMLElement>(
    '.graph-controller__graph-host',
  )
  if (ctrlSnapGraphHost) {
    const nodeIdPrefix = `${graphComponentId}-node-`
    let draggingNodeId: number | null = null

    const enableSnap = (internalId: number) => {
      ctrlSnapNodeId = internalId
      graphComponentRef.value?.setNodeSnapToGrid(!snapMode.value, internalId)
      graphComponentRef.value?.setShowGrid(true)
      disablePhysics()
    }
    const disableSnap = () => {
      if (ctrlSnapNodeId === null) return
      graphComponentRef.value?.setNodeSnapToGrid(undefined, ctrlSnapNodeId)
      ctrlSnapNodeId = null
      tutorialCtrlSnapCount.value++
      applyGridVisibility(showGrid.value)
      if (physicsMode.value === 'on') triggerSettle()
    }

    const handleCtrlSnapPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const nodeContainer = (event.target as Element).closest('.graph-controller__node-container')
      if (!nodeContainer) return
      const circle = nodeContainer.querySelector(`[id^="${nodeIdPrefix}"]`)
      if (!circle) return
      const domId = circle.getAttribute('id')
      if (!domId) return
      const internalId = parseInt(domId.slice(nodeIdPrefix.length))
      if (!Number.isFinite(internalId)) return
      draggingNodeId = internalId
      if (event.ctrlKey) enableSnap(internalId)
    }
    const handleCtrlSnapPointerUp = () => {
      disableSnap()
      draggingNodeId = null
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        if (draggingNodeId !== null) enableSnap(draggingNodeId)
        return
      }
      if (!isVisible.value) return
      const target = event.target as Element
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true'
      )
        return
      if (isShortcut(TOGGLE_GRID_SHORTCUT, event)) {
        event.preventDefault()
        toggleGrid()
      } else if (isShortcut(TOGGLE_PHYSICS_SHORTCUT, event)) {
        event.preventDefault()
        toggleNodePhysics()
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Control') return
      disableSnap()
    }

    ctrlSnapGraphHost.addEventListener('pointerdown', handleCtrlSnapPointerDown, true)
    ctrlSnapGraphHost.addEventListener('pointerup', handleCtrlSnapPointerUp, true)
    ctrlSnapGraphHost.addEventListener('pointercancel', handleCtrlSnapPointerUp, true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    ctrlSnapCleanup = () => {
      ctrlSnapGraphHost.removeEventListener('pointerdown', handleCtrlSnapPointerDown, true)
      ctrlSnapGraphHost.removeEventListener('pointerup', handleCtrlSnapPointerUp, true)
      ctrlSnapGraphHost.removeEventListener('pointercancel', handleCtrlSnapPointerUp, true)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }

  // The graph-component library only commits a node/link label edit on Enter; clicking
  // away discards it. We force a commit by simulating the same Enter keyup the library
  // listens for before the click can blur the input out from under it.
  const renameCommitGraphHost = containerRef.value?.querySelector<HTMLElement>(
    '.graph-controller__graph-host',
  )
  if (renameCommitGraphHost) {
    const handleRenameCommitPointerDown = (event: PointerEvent) => {
      const activeElement = document.activeElement
      if (!(activeElement instanceof HTMLInputElement)) return
      if (
        activeElement.id !== 'node-label-input-field' &&
        activeElement.id !== 'link-label-input-field'
      )
        return
      if (activeElement.contains(event.target as Node)) return
      activeElement.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    }
    renameCommitGraphHost.addEventListener('pointerdown', handleRenameCommitPointerDown, true)

    // The library focuses the label input it creates but leaves the caret at the end
    // instead of selecting the existing text. A bubble-phase 'click' listener can't see
    // this open: the library's own click handler calls stopPropagation() on the click
    // that creates the input, so it never reaches an ancestor. 'focusin' is a separate
    // event fired by the library's T.focus() call and isn't affected by that
    // stopPropagation(), so it reliably catches the moment the input becomes active.
    const handleRenameOpenFocus = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement)) return
      if (target.id !== 'node-label-input-field' && target.id !== 'link-label-input-field') return
      // Suppress the browser's spellcheck/autocomplete suggestion popover for argument
      // and link names — they're short labels, not prose, so suggestions are just noise.
      target.setAttribute('spellcheck', 'false')
      target.setAttribute('autocomplete', 'off')
      target.setAttribute('autocorrect', 'off')
      target.setAttribute('autocapitalize', 'off')
      // On touch devices, focusing the fresh label input pops the on-screen keyboard over
      // the graph on every node creation. Commit the default label (same simulated Enter the
      // pointerdown handler uses) so the library tears the input down and the keyboard stays
      // closed; the user taps the node to rename when they actually want to type.
      if (window.matchMedia('(pointer: coarse)').matches) {
        target.dispatchEvent(
          new KeyboardEvent('keyup', { key: 'Enter', bubbles: true, cancelable: true }),
        )
        return
      }
      target.select()
    }
    renameCommitGraphHost.addEventListener('focusin', handleRenameOpenFocus)

    renameCommitCleanup = () => {
      renameCommitGraphHost.removeEventListener('pointerdown', handleRenameCommitPointerDown, true)
      renameCommitGraphHost.removeEventListener('focusin', handleRenameOpenFocus)
    }
  }

  // Dismiss the action bar as soon as the user touches something else. Taps inside the graph
  // canvas manage the selection themselves (via `select`), and taps on the bar's own buttons
  // are handled there — everything else in the app closes it.
  const handleOutsidePointerDown = (event: PointerEvent) => {
    if (selection.value === null) return
    const target = event.target as Element | null
    if (target?.closest('.selection-action-bar')) return
    if (target?.closest('.graph-controller__graph-host')) return
    selection.value = null
  }
  document.addEventListener('pointerdown', handleOutsidePointerDown, true)
  selectionDismissCleanup = () =>
    document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
})

function toArrowType(linkType: LinkType): ArrowType {
  const override = linkConfigs[linkType]?.arrowType
  if (override !== undefined) return ArrowType[override]
  if (linkType === LinkType.SINGLE) return ArrowType.SINGLE
  if (linkType === LinkType.DOUBLE) return ArrowType.DOUBLE
  throw new Error('Encountered unsupported linkType')
}

function applyHyperLinkSourceColor(hyperLinkId: string, color: string): void {
  const el = graphComponentRef.value?.$el as Element | undefined
  if (!el) return
  const targetPath = el.querySelector(
    `#${CSS.escape(`${graphComponentId}-hyperlink-${hyperLinkId}`)}`,
  )
  const container = targetPath?.closest('.graph-controller__hyperlink-container')
  if (!container) return
  container
    .querySelectorAll<SVGPathElement>('.graph-controller__hyperlink-source-path')
    .forEach((path) => {
      path.style.stroke = color
    })
}

function applyLinkDash(linkId: string, dashArray?: string): void {
  const el = graphComponentRef.value?.$el?.querySelector(
    `.graph-controller__link[id$="-link-${linkId}"]`,
  )
  if (el instanceof SVGPathElement) {
    el.style.strokeDasharray = dashArray ?? ''
  }
}

function setGraph(state: GraphEditorState, center: boolean): void {
  const graphComponent = graphComponentRef.value
  if (graphComponent === null) {
    throw new Error('Graph component is not rendered.')
  }
  // A redraw reassigns internal ids, so any open selection no longer resolves — dismiss it.
  selection.value = null
  // The library resets its hyperlink source set on setGraph too; drop our mirror so the
  // pending-set pill doesn't linger with stale internal ids after a re-render.
  hyperLinkSources.value = []
  // When physics is active, nodes may have drifted from their stored model positions.
  // Capture current visual positions before resetting so nodes don't snap back.
  const preservedPositions = new Map<number, { x: number; y: number }>()
  if (physicsMode.value !== 'off') {
    for (const internalId of idMapping.inputIds()) {
      preservedPositions.set(
        idMapping.getOrFail(internalId),
        graphComponent.getNodePosition(internalId),
      )
    }
  }
  // Capture the D3 zoom state before setGraph destroys and recreates the SVG canvas.
  // setGraph resets D3 zoom to identity; restoring it keeps the graph visually stable.
  // Only for in-place redraws (center=false) — initial renders should use the library defaults.
  const savedZoom = center
    ? null
    : (() => {
        const z = (
          containerRef.value?.querySelector('.graph-controller__graph-canvas') as
            | (SVGElement & { __zoom?: { k: number; x: number; y: number } })
            | null
        )?.__zoom
        return z != null ? { k: z.k, x: z.x, y: z.y } : null
      })()
  idGenerator = new IdGenerator()
  idMapping = new IdMapping()
  liveNodePositions.value = new Map()
  const nodes: jsonNode[] = state.nodes.map((node) => {
    const preserved = preservedPositions.get(node.id)
    return {
      id: node.id,
      label: node.label,
      x: preserved?.x ?? node.x,
      y: preserved?.y ?? node.y,
      color: effectiveStyle.value.nodeColor,
      outline: nodeOutlines?.get(node.id),
    }
  })
  const links: jsonLink[] = state.links.map((link) => ({
    sourceId: link.sourceId,
    targetId: link.targetId,
    color: linkConfigs[link.type]?.color ?? effectiveStyle.value.linkColor,
    arrowType: toArrowType(link.type),
  }))
  const hyperLinks: jsonHyperLink[] = (state.hyperLinks ?? []).map((hyperLink) => ({
    sourceIds: hyperLink.sourceIds,
    targetId: hyperLink.targetId,
    color: linkConfigs[hyperLink.type]?.color ?? effectiveStyle.value.linkColor,
  }))

  graphComponent.setGraph({ nodes, links, hyperLinks }, true)
  const { nodes: importedNodes } = graphComponent.getGraph(
    'json',
    false,
    false,
    false,
    false,
    true,
  ) as { nodes: { id: number; idImported: number }[] }

  for (const importedNode of importedNodes) {
    idGenerator.forward(importedNode.idImported)
    idMapping.add(importedNode.id, importedNode.idImported)
  }

  void nextTick(() => {
    previousBadgeInternalIds = new Set()
    applyNodeWeights(nodeWeights)
    // Outlines were already applied wholesale as node props by setGraph above.
    previousNodeOutlines = new Map(nodeOutlines ?? [])
    previousAnnotationContent = new Map()
    for (const [publicId, annotation] of nodeAnnotations ?? []) {
      if (!idMapping.hasReverse(publicId)) continue
      const internalId = idMapping.getOrFailReverse(publicId)
      graphComponent.createAnnotation(internalId, annotation.content, annotation.position)
      previousAnnotationContent.set(publicId, annotation.content)
    }
    for (const link of state.links) {
      const internalSourceId = idMapping.getOrFailReverse(link.sourceId)
      const internalTargetId = idMapping.getOrFailReverse(link.targetId)
      applyLinkDash(`${internalSourceId}-${internalTargetId}`, linkConfigs[link.type]?.dashArray)
    }
    for (const hyperLink of state.hyperLinks ?? []) {
      const internalSourceIds = hyperLink.sourceIds
        .map((id) => idMapping.getOrFailReverse(id))
        .sort((a, b) => a - b)
      const internalTargetId = idMapping.getOrFailReverse(hyperLink.targetId)
      const internalHyperLinkId = `${internalSourceIds.join(',')}-${internalTargetId}`
      const color = linkConfigs[hyperLink.type]?.color ?? effectiveStyle.value.linkColor
      applyHyperLinkSourceColor(internalHyperLinkId, color)
    }
    for (const importedNode of importedNodes) {
      const node = state.nodes.find((n) => n.id === importedNode.idImported)
      if (node?.label)
        adjustNodeLabelFontSize(
          graphComponentRef.value?.$el as Element | undefined,
          graphComponentId,
          importedNode.id,
          node.label,
        )
    }
    // setGraph recreates the SVG canvas and resets D3 zoom to identity. Restore the
    // captured zoom so node visual positions don't jump after an in-place redraw. Route
    // through setViewport so the library's cached transform (used by pointer-to-graph math,
    // e.g. the edge-creation preview) stays in sync.
    if (savedZoom !== null) {
      graphComponent.setViewport(savedZoom.k, savedZoom.x, savedZoom.y)
    }
    // setGraph rebuilds the graph DOM, potentially replacing the zoom group element that
    // zoomObserver and dragObserver are watching. Reconnect them to the current element
    // so that the overlay transform sync and live drag positions keep working.
    setupZoomAndDragObservers()
    applyGridVisibility(showGrid.value)
    graphComponentRef.value?.setGridType(defaultGridType.value)
    graphComponentRef.value?.setGridCellSize(ARGUMENT_RADIUS_IN_PX * gridCellScale.value)
    graphComponentRef.value?.setSnapToGrid(snapMode.value)
    if (physicsMode.value === 'on' && center) {
      triggerSettle()
    }
  })

  if (center) {
    // Initial fit after (re)loading a graph: jump instantly, no glide from the reset transform.
    fitToView(0, 0, 0)
  }
}

function updateLinkType(linkId: string, linkType: LinkType) {
  arrowSwitcherTarget.value = undefined
  tutorialLinkTypeSwitchCount.value++
  const { sourceId: internalSourceId, targetId: internalTargetId } = parseLinkId(linkId)
  const publicSourceId = idMapping.getOrFail(internalSourceId)
  const publicTargetId = idMapping.getOrFail(internalTargetId)
  emit('linkChanged', { sourceId: publicSourceId, targetId: publicTargetId, type: linkType })
  const arrowType = toArrowType(linkType)
  const linkColor = linkConfigs[linkType]?.color ?? effectiveStyle.value.linkColor
  graphComponentRef.value!.setColor(linkColor, linkId)
  graphComponentRef.value!.setLinkArrowType(arrowType, linkId)
  applyLinkDash(linkId, linkConfigs[linkType]?.dashArray)
}

function onLabelEdited(
  parent: {
    id: string | number
  },
  label: string,
) {
  const privateId = parent.id
  if (typeof privateId !== 'number') {
    return
  }
  if (!idMapping.has(privateId)) {
    return
  }
  const publicId = idMapping.getOrFail(privateId)
  // Reject blank names: restore the argument's previous label instead of leaving it unnamed.
  // Runs after the library finishes committing the (empty) edit, so the restore isn't overwritten.
  if (label.trim() === '') {
    const previous = state.nodes.find((node) => node.id === publicId)?.label ?? ''
    nextTick(() => {
      graphComponentRef.value?.setLabel(previous, privateId)
      adjustNodeLabelFontSize(
        graphComponentRef.value?.$el as Element | undefined,
        graphComponentId,
        privateId,
        previous,
      )
    })
    return
  }
  tutorialRenameCount.value++
  emit('nodeLabelEdited', { id: publicId, label: label })
  nextTick(() =>
    adjustNodeLabelFontSize(
      graphComponentRef.value?.$el as Element | undefined,
      graphComponentId,
      privateId,
      label,
    ),
  )
}

const arrowSwitcherTarget = shallowRef<
  | {
      targetElement: SVGElement
      linkId: string
    }
  | undefined
>(undefined)

function formatWeight(w: number): string {
  return Number.isInteger(w) ? String(w) : w.toFixed(2)
}

let previousBadgeInternalIds = new Set<number>()

function applyNodeWeights(weights: Map<NodeId, number> | undefined) {
  const graphComponent = graphComponentRef.value
  if (!graphComponent) return
  const activeInternalIds = new Set<number>()
  for (const [publicId, weight] of weights ?? []) {
    if (!idMapping.hasReverse(publicId)) continue
    const internalId = idMapping.getOrFailReverse(publicId)
    graphComponent.setNodeBadge(internalId, formatWeight(weight))
    activeInternalIds.add(internalId)
  }
  for (const internalId of previousBadgeInternalIds) {
    if (!activeInternalIds.has(internalId)) graphComponent.setNodeBadge(internalId, undefined)
  }
  previousBadgeInternalIds = activeInternalIds
}

watch(
  () => nodeWeights,
  (weights) => applyNodeWeights(weights),
)

let previousNodeOutlines = new Map<NodeId, NodeOutline>()

// Like annotations below, outlines are applied wholesale on a full setGraph import;
// this watcher covers changes between imports (e.g. an uncertain iAF argument created
// interactively, or an existing one toggled), including clearing an outline when a
// node no longer has an entry.
function applyNodeOutlineUpdates(outlines: Map<NodeId, NodeOutline> | undefined) {
  const graphComponent = graphComponentRef.value
  if (!graphComponent) return
  const next = new Map<NodeId, NodeOutline>()
  for (const [publicId, outline] of outlines ?? []) {
    next.set(publicId, outline)
    if (previousNodeOutlines.get(publicId) === outline) continue
    if (!idMapping.hasReverse(publicId)) continue
    graphComponent.setNodeOutline(outline, idMapping.getOrFailReverse(publicId))
  }
  for (const publicId of previousNodeOutlines.keys()) {
    if (next.has(publicId)) continue
    if (!idMapping.hasReverse(publicId)) continue
    graphComponent.setNodeOutline(undefined, idMapping.getOrFailReverse(publicId))
  }
  previousNodeOutlines = next
}

watch(
  () => nodeOutlines,
  (outlines) => applyNodeOutlineUpdates(outlines),
)

let previousAnnotationContent = new Map<NodeId, string>()

// Content-only updates (e.g. a probability value changing) go through the annotation's own
// setter rather than a full setGraph() redraw, so routine edits don't reset zoom/physics.
// Position is deliberately never pushed from here - it flows app -> library once at creation
// (via setGraph below) and library -> app via the annotation-moved event, so a user's drag
// isn't immediately overwritten by this watcher reacting to its own resulting state change.
function applyAnnotationContentUpdates(
  annotations: Map<NodeId, { content: string; position?: AnnotationPosition }> | undefined,
) {
  const graphComponent = graphComponentRef.value
  if (!graphComponent) return
  const nextContent = new Map<NodeId, string>()
  for (const [publicId, annotation] of annotations ?? []) {
    nextContent.set(publicId, annotation.content)
    if (previousAnnotationContent.get(publicId) === annotation.content) continue
    if (!idMapping.hasReverse(publicId)) continue
    const internalId = idMapping.getOrFailReverse(publicId)
    if (!previousAnnotationContent.has(publicId)) {
      // Node was created interactively after the last setGraph import, so no
      // annotation element exists yet - setAnnotationContent would silently no-op.
      graphComponent.createAnnotation(internalId, annotation.content, annotation.position)
    } else {
      graphComponent.setAnnotationContent(internalId, annotation.content)
    }
  }
  previousAnnotationContent = nextContent
}

watch(
  () => nodeAnnotations,
  (annotations) => applyAnnotationContentUpdates(annotations),
)

function onAnnotationClicked(
  annotation: { anchorId: number; content: string },
  event: PointerEvent,
) {
  if (!idMapping.has(annotation.anchorId)) return
  const publicId = idMapping.getOrFail(annotation.anchorId)
  emit('annotationClicked', { id: publicId, content: annotation.content }, event)
}

function onAnnotationMoved(annotations: AnnotationPositionSnapshot[]) {
  const data = annotations
    .filter((a) => idMapping.has(a.anchorId))
    .map((a) => ({ id: idMapping.getOrFail(a.anchorId), position: a.position }))
  emit('annotationMoved', data)
}

let zoomObserver: MutationObserver | undefined
let dragObserver: MutationObserver | undefined
let doubleTapCleanup: (() => void) | undefined
let middleClickCleanup: (() => void) | undefined
let ctrlSnapCleanup: (() => void) | undefined
let renameCommitCleanup: (() => void) | undefined
let selectionDismissCleanup: (() => void) | undefined
let ctrlSnapNodeId: number | null = null
// Live node positions updated on every D3 tick during drag, so the overlay
// doesn't lag behind until nodes-moved fires on mouseup.
const liveNodePositions = shallowRef<Map<NodeId, { x: number; y: number }>>(new Map())

// Clear live positions whenever state is committed (physics tick, undo, document load, etc.)
// so stale drag coords can't override the freshly committed state.nodes.
// During an active drag no state is committed, so the stateId is stable and
// the dragObserver continues to populate liveNodePositions normally.
watch(
  () => state.stateId,
  () => {
    liveNodePositions.value = new Map()
  },
)

const overlayNodes = computed(() => {
  const live = liveNodePositions.value
  if (live.size === 0) return state.nodes
  return state.nodes.map((node) => {
    const livePos = live.get(node.id)
    return livePos !== undefined ? { ...node, ...livePos } : node
  })
})

onUnmounted(() => {
  zoomObserver?.disconnect()
  dragObserver?.disconnect()
  doubleTapCleanup?.()
  middleClickCleanup?.()
  ctrlSnapCleanup?.()
  renameCommitCleanup?.()
  selectionDismissCleanup?.()
})

// While a mobile tutorial is active this holds the docked card's clearance (px it reaches from the
// viewport top); null when no tutorial is docked. Persisting it means every fitToView — including
// the plain refits fired after an async example load or a physics settle — keeps the graph clear of
// the card, instead of a later fitToView() re-centering it under the card and winning the race.
const tutorialTopClearancePx = ref<number | null>(null)

// The bottom band covered while a mobile tutorial is docked: the command bar, or a taller open
// sheet (e.g. the compacted evaluation sheet). Recomputed per fit so it tracks the live chrome.
function tutorialBottomInset() {
  if (layoutMode.value !== 'compact') return 0
  const commandBar = mobileBottomBarRef.value?.offsetHeight ?? 0
  const sheet = document.querySelector<HTMLElement>('.sheet-panel')?.offsetHeight ?? 0
  return Math.max(commandBar, sheet)
}

// Duration (ms) of the animated recenter. `fitToView` animates by default so button/menu
// fits and the mobile eval re-fit glide; callers that must not feel sluggish (initial load)
// pass `0` for an instant jump.
const FIT_ANIMATION_MS = 280

function fitToView(extraBottomInset = 0, topClearancePx = 0, duration = FIT_ANIMATION_MS) {
  const graphComponent = graphComponentRef.value
  if (graphComponent === null) return
  // Centering math divides by the container size; a 0×0 box (e.g. while hidden in a
  // display:none surface) yields NaN transforms, so skip until the container is laid out.
  const container = containerRef.value
  if (!container || container.clientWidth === 0 || container.clientHeight === 0) return
  const margin = ARGUMENT_RADIUS_IN_PX * 2
  // The compact top bar floats over the full-height canvas, so inset the fit by its
  // occupied height (offsetHeight = the band it covers) to keep the graph clear of it.
  const topInset = layoutMode.value === 'compact' ? (mobileTopBarRef.value?.offsetHeight ?? 0) : 0
  // While a mobile tutorial is docked, always honor its card clearance and bottom band, so refits
  // triggered elsewhere (async load, settle) can't re-center the graph under the card.
  let clearance = topClearancePx
  let bottomInset = extraBottomInset
  if (tutorialTopClearancePx.value !== null && layoutMode.value === 'compact') {
    clearance = Math.max(clearance, tutorialTopClearancePx.value)
    bottomInset = Math.max(bottomInset, tutorialBottomInset())
  }
  // The mobile tutorial card floats lower down; `clearance` is how far it reaches from the
  // viewport top, so take whichever exclusion is larger to keep the graph clear of both.
  const top = margin + Math.max(topInset, clearance)
  // A docked sheet covers the bottom band; the extra inset there fits the graph into
  // the visible band above it instead of centring it under the sheet.
  graphComponent.centerView(
    { top, right: margin, bottom: margin + bottomInset, left: margin },
    undefined,
    1,
    duration,
  )
}

// A docked bottom sheet asks the graph to re-fit above it. `coveredFraction` is the
// sheet height as a fraction of the container; null re-fits using the full canvas.
function refitAboveSheet(coveredFraction: number | null) {
  const container = containerRef.value
  if (!container) return
  const inset = coveredFraction === null ? 0 : Math.round(container.clientHeight * coveredFraction)
  fitToView(inset)
}
provide(SHEET_REFIT_KEY, refitAboveSheet)

// The docked mobile tutorial card covers the top of the canvas; record its clearance (so every
// subsequent fitToView keeps the graph clear of it) and re-fit into the band below it now — or
// clear the clearance and restore the full fit with null on close.
provide(TUTORIAL_REFIT_KEY, (coveredTopPx: number | null) => {
  tutorialTopClearancePx.value = coveredTopPx
  fitToView()
})

async function doLayout(layout: Layout) {
  if (graphComponentRef.value === null) {
    return
  }
  tutorialRelayoutCount.value++
  const wasPhysicsOn = physicsMode.value === 'on'
  if (wasPhysicsOn) disablePhysics()

  const nodes = [...state.nodes]
    .sort((nodeA, nodeB) => nodeA.label.localeCompare(nodeB.label))
    .map((node) => node.id)
  const links: [number, number][] = [
    ...state.links.map((link) => [link.sourceId, link.targetId] as [number, number]),
    ...(state.hyperLinks ?? []).flatMap((hl) =>
      hl.sourceIds.map((sourceId) => [sourceId, hl.targetId] as [number, number]),
    ),
  ]
  const positions = await getNodePositions(nodes, links, layout)
  const newPositions = []
  for (const nodeId of nodes) {
    // nodeId is a public document id; the library keys nodes by internal id. Skip any node
    // not in the mapping (e.g. deleted without a redraw) so one stale id can't abort the layout.
    if (!idMapping.hasReverse(nodeId)) continue
    const position = positions.get(nodeId)!
    graphComponentRef.value.setNodePosition(position, undefined, idMapping.getOrFailReverse(nodeId))
    newPositions.push({
      id: nodeId,
      x: position.x,
      y: position.y,
    })
  }
  emit('nodesMoved', newPositions)

  if (wasPhysicsOn) {
    triggerSettle()
  } else {
    // Instant jump: the graph just snapped to new positions, so an animated recenter would
    // feel like a second, sluggish move.
    fitToView(0, 0, 0)
  }
}

const linkSwitchButtonRef = useTemplateRef('linkSwitchButton')
const evaluationButtonsRef = useTemplateRef<HTMLDivElement>('evaluationButtons')
const extensionEvalButtonRef = useTemplateRef<HTMLButtonElement>('extensionEvalButton')
const exportButtonRef = useTemplateRef('exportButton')
const mainMenuBottomRef = useTemplateRef<HTMLDivElement>('mainMenuBottom')

const isTouchDevice = useMediaQuery('(pointer: coarse)')

// --- Compact (mobile) chrome ---
// In the compact layout the desktop left-edge cluster and main menu are hidden and
// replaced by a top bar + bottom command bar rendered below, plus Menu/Relayout sheets.
const { layoutMode } = useLayoutMode()
const isMenuOpen = ref(false)
const isRelayoutOpen = ref(false)
const isSettingsOpen = ref(false)

// The evaluation sheet is non-modal (canvas stays live), so a modal sheet opened over it
// would otherwise leave it stranded behind the backdrop — dismiss it first.
watch([isMenuOpen, isRelayoutOpen], ([menu, relayout]) => {
  if (menu || relayout) evaluationOpen.value = false
})

// Spotlight targets for the mobile tutorial overlay: the compact-chrome equivalents of the
// desktop anchor elements. Module-specific anchors fall through to tutorialRefs when present.
const mobileTopBarRef = useTemplateRef<HTMLElement>('mobileTopBar')
const mobileMenuButtonRef = useTemplateRef<HTMLButtonElement>('mobileMenuButton')
const mobileEvaluateButtonRef = useTemplateRef<HTMLButtonElement>('mobileEvaluateButton')
const mobileExportButtonRef = useTemplateRef<HTMLButtonElement>('mobileExportButton')
const mobileUndoButtonRef = useTemplateRef<HTMLButtonElement>('mobileUndoButton')
const mobileFitToViewButtonRef = useTemplateRef<HTMLButtonElement>('mobileFitToViewButton')
const mobileBottomBarRef = useTemplateRef<HTMLElement>('mobileBottomBar')
const mobileRelayoutButtonRef = useTemplateRef<HTMLButtonElement>('mobileRelayoutButton')
const mobileLinkSwitchButtonRef = useTemplateRef<HTMLElement>('mobileLinkSwitchButton')
const mobileTutorialRefs = computed<Record<string, HTMLElement | null>>(() => ({
  evaluationButtons: mobileEvaluateButtonRef.value,
  exportButton: mobileExportButtonRef.value,
  fitToViewButton: mobileFitToViewButtonRef.value,
  mainMenuBottom: mobileMenuButtonRef.value,
  undoButton: mobileUndoButtonRef.value,
  linkSwitchButton: mobileLinkSwitchButtonRef.value,
  relayoutButton: mobileRelayoutButtonRef.value,
  // Spotlight the evaluate button only until the eval sheet opens, so it doesn't linger while
  // the user taps through Add evaluation → Extension semantics.
  openEvalButton: evaluationOpen.value ? null : mobileEvaluateButtonRef.value,
  ...tutorialRefs,
  ...dynamicTutorialRefs,
}))
// Split the layouts into the two mockup groups: directed (edge-following) vs. the
// force/geometric engines. The first four entries are the directed ones.
const relayoutGroups = [
  {
    label: 'Directed',
    options: GRAPH_EDITOR_LAYOUTS.slice(0, 4).map((layout) => ({
      layout,
      ...layoutDatas[layout],
    })),
  },
  {
    label: 'Other',
    options: GRAPH_EDITOR_LAYOUTS.slice(4).map((layout) => ({
      layout,
      ...layoutDatas[layout],
    })),
  },
]

function relayoutTo(layout: Layout) {
  doLayout(layout)
  isRelayoutOpen.value = false
}

function runFromMenu(action: () => void) {
  isMenuOpen.value = false
  action()
}

function openDocumentSwitcher() {
  evaluationOpen.value = false
  emit('home')
}

// Command surface a shell drives instead of the editor's own chrome. The desktop
// main menu and toolbar still call these same functions; nothing here changes their
// behaviour, it only makes them reachable from outside.
function openExport() {
  isExportOpened.value = true
}
function openSettings() {
  // Mobile gets a native bottom sheet; desktop keeps the centered modal.
  if (layoutMode.value === 'compact') isSettingsOpen.value = true
  else settingsDialog.value?.open()
}
function openHelp() {
  isHelpOpened.value = true
}
function openTutorials() {
  isTutorialWindowOpen.value = true
}

defineExpose({
  fitToView,
  applyLayout: doLayout,
  toggleGrid,
  toggleNodePhysics,
  openExport,
  openSettings,
  openHelp,
  openTutorials,
  gridVisibility: showGrid,
  physicsMode,
  hasRanking: hasRankingSlot,
  hasSerialisation: hasSerialisationSlot,
} satisfies GraphEditorCommands)
</script>
<template>
  <div
    class="h-full w-full"
    ref="container"
    :style="{
      '--graph-node-color': effectiveStyle.nodeColor,
      '--graph-node-stroke-color': effectiveStyle.nodeStrokeColor,
      '--graph-node-stroke-width': `${effectiveStyle.nodeStrokeWidth}px`,
      '--graph-link-stroke-width': `${effectiveStyle.linkStrokeWidth}px`,
    }"
  >
    <GraphComponent
      @node-created="onNodeCreated"
      @node-deleted="onNodeDeleted"
      @link-clicked="onLinkClicked"
      @link-created="onLinkCreated"
      @link-deleted="onLinkDeleted"
      @hyper-link-created="onHyperLinkCreated"
      @hyper-link-deleted="onHyperLinkDeleted"
      @nodes-moved="onNodesMoved"
      @label-edited="onLabelEdited"
      @annotation-clicked="onAnnotationClicked"
      @annotation-moved="onAnnotationMoved"
      @select="onSelect"
      @hyper-link-sources-changed="onHyperLinkSourcesChanged"
      :id="graphComponentId"
      ref="graph-component"
    />
    <SelectionActionBar
      v-if="selection"
      :get-reference-rect="selectionReferenceRect"
      :actions="selectionActions"
      @close="selection = null"
    />
    <svg
      v-show="!!slots.nodeOverlay"
      class="absolute inset-0 w-full h-full pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g ref="overlay-group">
        <slot name="nodeOverlay" :nodes="overlayNodes" />
      </g>
    </svg>
    <div
      class="pointer-events-none w-full opacity-50 absolute inset-0 flex items-center"
      v-if="layoutMode === 'regular' && state.nodes.length === 0 && showHints"
    >
      <div class="m-auto w-fit">
        <HelpControls :link-names="linkNames" :allow-hyper-link-creation="allowHyperLinkCreation" />
      </div>
    </div>
    <ArrowSwitcher
      v-if="arrowSwitcherTarget"
      :link-configs="linkConfigs"
      :reference="arrowSwitcherTarget.targetElement"
      @update:arrow-type="updateLinkType(arrowSwitcherTarget.linkId, $event)"
      @close="arrowSwitcherTarget = undefined"
    />
    <div
      v-if="layoutMode === 'regular'"
      class="absolute top-4 bottom-4 left-4 flex flex-col justify-between"
    >
      <div class="flex flex-1 flex-col justify-between">
        <div class="w-fit">
          <MainMenu
            @new="emit('new')"
            @load="emit('load')"
            @generate="emit('generate')"
            :show-save="EntryState.ENABLE"
            :layouts-to-show="GRAPH_EDITOR_LAYOUTS"
            @save="emit('save')"
            :show-export="isExportOpened ? EntryState.DISABLE : EntryState.ENABLE"
            @export="isExportOpened = !isExportOpened"
            :show-share="EntryState.ENABLE"
            @share="emit('share')"
            @layout="doLayout($event)"
            :show-undo="historyState.canUndo ? EntryState.ENABLE : EntryState.DISABLE"
            @undo="emit('undo')"
            :show-redo="historyState.canRedo ? EntryState.ENABLE : EntryState.DISABLE"
            @redo="emit('redo')"
            @help="isHelpOpened = !isHelpOpened"
            @settings="settingsDialog?.open()"
            @tutorial="isTutorialWindowOpen = !isTutorialWindowOpen"
          />
          <div ref="mainMenuBottom" class="h-0"></div>
        </div>

        <div class="flex flex-1 justify-end flex-col gap-2">
          <slot name="toolbar" />
          <div ref="linkSwitchButton" class="join join-vertical mb-8" v-if="enableLinkSwitching">
            <button
              v-for="(linkConfig, linkKey) in linkConfigs"
              :key="linkKey"
              class="join-item btn btn-square btn-sm"
              :class="{ 'btn-active': selectedLinkType === linkKey }"
              :title="linkConfig!.displayName"
              @click="selectedLinkType = linkKey"
            >
              <component :is="linkConfig!.icon" v-if="linkConfig!.icon" class="size-5 opacity-70" />
              <ArrowLongRightIcon
                v-else-if="linkKey === LinkType.SINGLE"
                class="size-5 opacity-70"
              />
              <ArrowDoubleLongRightIcon v-else class="size-5 opacity-70" />
            </button>
          </div>
          <div ref="evaluationButtons" class="flex flex-col gap-2">
            <button
              ref="extensionEvalButton"
              class="btn btn-square btn-sm"
              @click="emit('open-extension-window')"
              title="Extension Semantics"
            >
              <SigmaIcon class="size-6 opacity-70" />
            </button>
            <button
              v-if="hasRankingSlot"
              class="btn btn-square btn-sm"
              @click="emit('open-ranking-window')"
              title="Ranking Semantics"
            >
              <SucceqIcon class="size-6 opacity-70" />
            </button>
            <button
              v-if="hasSerialisationSlot"
              class="btn btn-square btn-sm"
              @click="emit('open-serialisation-window')"
              title="Serialisation Sequences"
            >
              <SerialisationIcon class="size-6 opacity-70" />
            </button>
          </div>
          <button
            ref="exportButton"
            class="btn btn-square btn-sm"
            @click="isExportOpened = !isExportOpened"
            title="Export"
          >
            <PhotoIcon class="size-6 opacity-70" />
          </button>
        </div>
      </div>
      <div class="flex flex-1 items-end pointer-events-none"></div>
    </div>

    <!-- Compact chrome: top bar + bottom command bar, replacing the desktop cluster. -->
    <template v-if="layoutMode === 'compact'">
      <header
        ref="mobileTopBar"
        class="absolute top-0 inset-x-0 z-20 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2.5 h-14 bg-base-200/95 backdrop-blur border-b border-base-300"
        style="padding-top: env(safe-area-inset-top)"
      >
        <!-- Switcher chip: back to home / document picker -->
        <button
          class="flex items-center gap-2 h-11 min-w-0 pl-1.5 pr-2.5 rounded-xl bg-base-100 border border-base-300 shadow-sm"
          aria-label="Back to frameworks"
          @click="openDocumentSwitcher"
        >
          <span
            class="grid place-items-center size-7 shrink-0 rounded-lg bg-primary/25 text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="size-[1.1rem]"
            >
              <circle cx="7" cy="7" r="3" />
              <circle cx="17" cy="17" r="3" />
              <path d="M9.5 9.5 14.5 14.5" />
            </svg>
          </span>
          <span class="flex flex-col items-start min-w-0 leading-tight">
            <span class="text-sm font-semibold truncate max-w-38">{{
              documentName || 'Untitled'
            }}</span>
            <span v-if="typeBadge" class="text-[0.7rem] text-base-content/60 truncate max-w-38">{{
              typeBadge
            }}</span>
          </span>
          <ChevronDownIcon class="size-4 shrink-0 opacity-50" />
        </button>
        <span class="text-base font-bold text-base-content/80 text-center truncate">
          AgonProject
        </span>
        <button
          ref="mobileMenuButton"
          class="btn btn-square size-11 btn-ghost"
          aria-label="Menu"
          @click="isMenuOpen = true"
        >
          <Bars3Icon class="size-6 opacity-70" />
        </button>
      </header>

      <!-- Fixed 5-button command bar: distribute every action across the available width. -->
      <nav
        ref="mobileBottomBar"
        class="absolute bottom-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-2 pt-2 bg-base-200/95 backdrop-blur border-t border-base-300"
        style="padding-bottom: max(env(safe-area-inset-bottom), 0.5rem)"
      >
        <div class="contents">
          <button
            ref="mobileFitToViewButton"
            class="btn btn-square size-11 shrink-0 rounded-xl bg-base-100 border-base-300 shadow-sm"
            aria-label="Fit to view"
            title="Fit to view"
            @click="(tutorialCenterCount++, fitToView())"
          >
            <ArrowsPointingInIcon class="size-6 opacity-70" />
          </button>
          <button
            ref="mobileRelayoutButton"
            class="btn btn-square size-11 shrink-0 rounded-xl bg-base-100 border-base-300 shadow-sm"
            aria-label="Relayout"
            title="Relayout"
            @click="isRelayoutOpen = true"
          >
            <SparklesIcon class="size-6 opacity-70" />
          </button>
        </div>

        <button
          ref="mobileEvaluateButton"
          class="btn btn-primary h-13 min-w-0 shrink rounded-2xl px-4 gap-2 text-base font-semibold shadow-md shadow-primary/30"
          @click="evaluationOpen = true"
        >
          <PlayIcon class="size-6 shrink-0" />
          <span class="truncate">Evaluate</span>
        </button>

        <div class="contents">
          <button
            ref="mobileExportButton"
            class="btn btn-square size-11 shrink-0 rounded-xl bg-base-100 border-base-300 shadow-sm"
            aria-label="Export"
            title="Export"
            @click="isExportOpened = true"
          >
            <ShareIcon class="size-6 opacity-70" />
          </button>
          <button
            ref="mobileUndoButton"
            class="btn btn-square size-11 shrink-0 rounded-xl bg-base-100 border-base-300 shadow-sm"
            :disabled="!historyState.canUndo"
            aria-label="Undo"
            title="Undo"
            @click="emit('undo')"
          >
            <ArrowUturnLeftIcon class="size-6 opacity-70" />
          </button>
        </div>
      </nav>

      <!-- On-canvas creation-mode selectors, bottom-left, clear of the command bar.
           The generic link-type toggle is driven by linkConfigs; modules stack their
           own selectors (e.g. iAF argument certainty) above it via #canvasSelector. -->
      <div
        v-if="enableLinkSwitching || !!slots.canvasSelector"
        class="absolute left-3 z-10 flex flex-col items-start gap-2"
        style="bottom: calc(env(safe-area-inset-bottom, 0px) + 4.75rem)"
      >
        <slot name="canvasSelector" />
        <div v-if="enableLinkSwitching" ref="mobileLinkSwitchButton" class="join shadow-md">
          <button
            v-for="(linkConfig, linkKey) in linkConfigs"
            :key="linkKey"
            class="join-item btn btn-sm btn-square"
            :class="selectedLinkType === linkKey ? 'btn-primary' : 'btn-neutral'"
            :aria-label="linkConfig!.displayName"
            :aria-pressed="selectedLinkType === linkKey"
            :title="linkConfig!.displayName"
            @click="selectedLinkType = linkKey"
          >
            <component :is="linkConfig!.icon" v-if="linkConfig!.icon" class="size-5" />
            <ArrowLongRightIcon v-else-if="linkKey === LinkType.SINGLE" class="size-5" />
            <ArrowDoubleLongRightIcon v-else class="size-5" />
          </button>
        </div>
      </div>

      <BottomSheet v-model:open="isMenuOpen" title="Menu">
        <div class="flex flex-col gap-4 pb-4">
          <section class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold uppercase tracking-wide opacity-60 px-1">Framework</h3>
            <button
              class="btn btn-ghost justify-start gap-3"
              @click="runFromMenu(() => emit('new'))"
            >
              <DocumentPlusIcon class="size-5 menu-icon" /> New framework
            </button>
            <button
              class="btn btn-ghost justify-start gap-3"
              @click="runFromMenu(() => emit('load'))"
            >
              <FolderOpenIcon class="size-5 menu-icon" /> Open file
            </button>
            <button
              class="btn btn-ghost justify-start gap-3"
              @click="runFromMenu(() => emit('save'))"
            >
              <ArrowDownTrayIcon class="size-5 menu-icon" /> Save to device
            </button>
            <button
              class="btn btn-ghost justify-start gap-3"
              @click="runFromMenu(() => emit('generate'))"
            >
              <Squares2X2Icon class="size-5 menu-icon" /> Generate random
            </button>
          </section>
          <section class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold uppercase tracking-wide opacity-60 px-1">Edit</h3>
            <button
              class="btn btn-ghost justify-start gap-3"
              :disabled="!historyState.canUndo"
              @click="runFromMenu(() => emit('undo'))"
            >
              <ArrowUturnLeftIcon class="size-5 menu-icon" /> Undo
            </button>
            <button
              class="btn btn-ghost justify-start gap-3"
              :disabled="!historyState.canRedo"
              @click="runFromMenu(() => emit('redo'))"
            >
              <ArrowUturnRightIcon class="size-5 menu-icon" /> Redo
            </button>
          </section>
          <section class="flex flex-col gap-1">
            <h3 class="text-xs font-semibold uppercase tracking-wide opacity-60 px-1">App</h3>
            <button class="btn btn-ghost justify-start gap-3" @click="runFromMenu(openSettings)">
              <Cog6ToothIcon class="size-5 menu-icon" /> Settings
            </button>
            <button
              v-if="tutorials"
              class="btn btn-ghost justify-start gap-3"
              @click="runFromMenu(openTutorials)"
            >
              <AcademicCapIcon class="size-5 menu-icon" /> Tutorials
            </button>
            <RouterLink
              to="/glossary"
              class="btn btn-ghost justify-start gap-3"
              @click="isMenuOpen = false"
            >
              <BookOpenIcon class="size-5 menu-icon" /> Glossary
            </RouterLink>
            <button class="btn btn-ghost justify-start gap-3" @click="runFromMenu(openHelp)">
              <QuestionMarkCircleIcon class="size-5 menu-icon" /> Help
            </button>
          </section>
        </div>
      </BottomSheet>

      <BottomSheet v-model:open="isRelayoutOpen" title="Relayout">
        <div class="flex flex-col gap-5 pb-4">
          <section v-for="group in relayoutGroups" :key="group.label" class="flex flex-col gap-2">
            <h3 class="text-xs font-semibold uppercase tracking-wide opacity-60 px-1">
              {{ group.label }}
            </h3>
            <div class="grid grid-cols-2 gap-2.5">
              <button
                v-for="option in group.options"
                :key="option.layout"
                class="flex items-center gap-3 h-14 px-3.5 rounded-xl border border-base-300 bg-base-100 text-sm font-medium text-left"
                @click="relayoutTo(option.layout)"
              >
                <span
                  class="grid place-items-center size-8 shrink-0 rounded-lg bg-base-200 menu-icon"
                >
                  <component :is="option.icon" class="size-5" />
                </span>
                {{ option.name }}
              </button>
            </div>
          </section>
        </div>
      </BottomSheet>

      <BottomSheet v-model:open="isSettingsOpen" :title="t('settings.title')">
        <div class="pb-4">
          <SettingsContent />
        </div>
      </BottomSheet>
    </template>

    <slot
      name="evaluationExtensions"
      :on-highlight="
        (h: Highlight | undefined) => {
          extensionHighlightRef = h
        }
      "
    ></slot>
    <slot
      name="export"
      :isOpen="isExportOpened"
      :hasBeenOpened="hasExportBeenOpened"
      @isOpen="isExportOpened = $event"
    ></slot>
    <slot name="evaluationRanking"></slot>
    <slot
      name="evaluationSerialisation"
      :on-highlight="
        (h: Highlight | undefined) => {
          serialisationHighlightRef = h
        }
      "
    ></slot>
    <TutorialOverlay
      v-if="tutorials && showHints && layoutMode === 'regular'"
      :tutorials="tutorials"
      :default-tutorial-id="defaultTutorialId"
      :is-touch-device="isTouchDevice"
      :refs="{
        mainMenuBottom: mainMenuBottomRef,
        evaluationButtons: evaluationButtonsRef,
        extensionEvalButton: extensionEvalButtonRef,
        openEvalButton: extensionEvalButtonRef,
        exportButton: exportButtonRef,
        linkSwitchButton: linkSwitchButtonRef,
        ...tutorialRefs,
        ...dynamicTutorialRefs,
      }"
      :context="tutorialContext"
    />
    <TutorialOverlayMobile
      v-if="tutorials && showHints && layoutMode === 'compact'"
      :tutorials="tutorials"
      :default-tutorial-id="defaultTutorialId"
      :is-touch-device="isTouchDevice"
      :refs="mobileTutorialRefs"
      :context="tutorialContext"
    />
    <WindowTutorials
      v-if="tutorials"
      :tutorials="tutorials"
      :context="tutorialContext"
      v-model:open="isTutorialWindowOpen"
    />
    <WindowHelp
      :link-names="linkNames"
      :allow-hyper-link-creation="allowHyperLinkCreation"
      :node-tap-action="nodeTapAction"
      v-model:open="isHelpOpened"
    />
    <WindowSettings ref="settings-dialog" />
  </div>
</template>
<style>
.graph-controller__controls-overview {
  display: none !important;
}
</style>
