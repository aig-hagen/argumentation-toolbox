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
<script setup lang="ts" generic="DocumentT">
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
} from '@heroicons/vue/24/outline'
import { computedAsync } from '@vueuse/core'
import { basicSetup } from 'codemirror'
import copy from 'copy-to-clipboard'
import { computed, inject, ref, shallowRef, useTemplateRef, watch, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import ButtonCopy from '@/modules/common/export/ButtonCopy.vue'
import ButtonSave from '@/modules/common/export/ButtonSave.vue'
import ExportSheet from '@/modules/common/export/ExportSheet.vue'
import { GRAPH_SVG_RENDERER_KEY } from '@/modules/common/graph-editor/graphEditor'
import { useLayoutMode } from '@/modules/common/layout/useLayoutMode'
import { useSettings } from '@/modules/common/settings/useSettings'
import WindowShell from '@/modules/common/window/WindowShell.vue'

import type { ExportConfig, ExportFileData } from '.'

const { t } = useI18n({ useScope: 'global' })

const open = defineModel<boolean>('open', { required: true })
const { input, exportConfigs } = defineProps<{
  input: DocumentT
  exportConfigs: ExportConfig<DocumentT>[]
}>()

const emit = defineEmits<{
  export: [filedata: ExportFileData]
}>()

const soureViewRef = useTemplateRef('soureView')
const editorView = shallowRef<EditorView | undefined>(undefined)

const { gridCellScale } = useSettings()
const { layoutMode } = useLayoutMode()

// A device-agnostic SVG export that serializes the live graph canvas (see renderGraphSvg). It
// sits alongside the real ExportConfigs in the format picker but has no model-based export()
// and no code/style options, so it's tracked by a sentinel key rather than a config object.
const WYSIWYG_SVG_KEY = '__wysiwyg_svg__'
const graphSvgRenderer = inject(GRAPH_SVG_RENDERER_KEY, undefined)

const selectedFormatKey = shallowRef<string>(exportConfigs[0]?.name ?? WYSIWYG_SVG_KEY)
const isWysiwygSvg = computed(() => selectedFormatKey.value === WYSIWYG_SVG_KEY)
const selectedExportConfig = computed<ExportConfig<DocumentT> | undefined>(() =>
  isWysiwygSvg.value
    ? undefined
    : exportConfigs.find((config) => config.name === selectedFormatKey.value),
)
const selectedArgumentStyle = shallowRef<string>('standard')
const selectedNameStyle = shallowRef<string>('math')
const selectedAttackStyle = shallowRef<string>('standard')
const selectedSupportStyle = shallowRef<string>('double')
const selectedNodeDistance = shallowRef<number>(1.5)

const isBipolarDocument = computed(() => {
  const maybeSupports = (input as unknown as { supports?: unknown }).supports
  return typeof maybeSupports === 'function'
})

const usePackageLine = computed(() => {
  if (selectedExportConfig.value?.name !== 'LaTeX (argumentation)') return undefined
  const opts = [
    ...(selectedArgumentStyle.value !== 'standard'
      ? [`argumentstyle=${selectedArgumentStyle.value}`]
      : []),
    `namestyle=${selectedNameStyle.value}`,
    ...(selectedAttackStyle.value !== 'standard'
      ? [`attackstyle=${selectedAttackStyle.value}`]
      : []),
  ]
  if (isBipolarDocument.value) opts.push(`supportstyle=${selectedSupportStyle.value}`)
  return `\\usepackage[${opts.join(',')}]{argumentation}`
})

const packageLineCopied = ref(false)
let packageLineCopyTimeout: ReturnType<typeof setTimeout>
function copyPackageLine() {
  if (usePackageLine.value === undefined) return
  copy(usePackageLine.value)
  packageLineCopied.value = true
  clearTimeout(packageLineCopyTimeout)
  packageLineCopyTimeout = setTimeout(() => (packageLineCopied.value = false), 500)
}

const exportResult = computed(() => {
  if (!open.value) {
    return undefined
  }
  // The compact layout renders ExportSheet, which owns its own export computation.
  if (layoutMode.value === 'compact') {
    return undefined
  }
  if (selectedExportConfig.value === undefined) {
    return undefined
  }
  return selectedExportConfig.value.export(input, {
    argumentStyle: selectedArgumentStyle.value,
    nameStyle: selectedNameStyle.value,
    attackStyle: selectedAttackStyle.value,
    supportStyle: selectedSupportStyle.value,
    nodeDistance: selectedNodeDistance.value,
    gridCellScale: gridCellScale.value,
  })
})

const saveFiledataText = computed(() => {
  if (exportResult.value === undefined) {
    return
  }
  const extension = selectedExportConfig.value?.extension ?? 'tex'
  return {
    content: exportResult.value.text,
    ending: extension,
  }
})

const svgTextEvaluating = shallowRef(false)
const svgTextMaybeLoading = computedAsync(
  async () => {
    const svgFactory = exportResult.value?.svg
    if (svgFactory === undefined) {
      return null
    }
    return await svgFactory()
  },
  null,
  svgTextEvaluating,
)

const svgText = computed(() => {
  if (svgTextEvaluating.value || svgTextMaybeLoading.value === null) {
    return undefined
  }
  return svgTextMaybeLoading.value
})

const saveFiledataSvg = computed(() => {
  if (svgText.value === undefined) {
    return
  }
  return {
    content: svgText.value,
    ending: 'svg',
  }
})

// Re-serialized whenever the SVG format is selected and the document changes, so the preview
// tracks the live graph — including moved nodes. `flush: 'post'` runs after the graph canvas has
// re-rendered the edit, so we serialize the updated DOM rather than the pre-move positions.
const wysiwygSvgText = shallowRef<string | undefined>(undefined)
watch(
  [open, isWysiwygSvg, () => input],
  ([isOpen, isWysiwyg]) => {
    wysiwygSvgText.value = isOpen && isWysiwyg ? (graphSvgRenderer?.() ?? undefined) : undefined
  },
  { immediate: true, flush: 'post' },
)
const saveFiledataWysiwygSvg = computed(() =>
  wysiwygSvgText.value === undefined ? undefined : { content: wysiwygSvgText.value, ending: 'svg' },
)

// An explicit `watch` (not `watchEffect`) so assigning `editorView` below doesn't feed back
// as a dependency — with the async body that would re-trigger endlessly and thrash the editor.
watch(
  [soureViewRef, selectedExportConfig],
  async ([sourceView, config], _prev, onCleanup) => {
    editorView.value?.destroy()
    editorView.value = undefined
    if (sourceView == null || config === undefined) {
      return
    }
    // The loader awaits a dynamic import; bail if the watch re-ran (format switched) meanwhile.
    let stale = false
    onCleanup(() => {
      stale = true
    })
    const additionalExtensions: Extension[] =
      (await config.codemirrorOptions?.loadExtensions()) ?? []
    if (stale) {
      return
    }
    editorView.value = new EditorView({
      doc: undefined,
      parent: sourceView,
      // See https://codemirror.net/examples/readonly/
      extensions: [
        basicSetup,
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.contentAttributes.of({ tabindex: '0' }),
        ...additionalExtensions,
      ],
    })
  },
  { immediate: true },
)

watchEffect(() => {
  if (editorView.value === undefined) {
    return
  }
  if (selectedExportConfig.value === undefined) {
    return
  }
  if (exportResult.value === undefined) {
    return
  }
  editorView.value.dispatch({
    changes: { from: 0, insert: exportResult.value.text, to: editorView.value.state.doc.length },
  })
})
</script>

<template>
  <WindowShell
    v-model:open="open"
    :title="t('menu.export')"
    :initial-position="{ x: 64, y: 128 }"
    :intitalSize="{ width: 700, height: 480 }"
  >
    <ExportSheet
      v-if="layoutMode === 'compact'"
      :input="input"
      :export-configs="exportConfigs"
      @export="emit('export', $event)"
      @close="open = false"
    />
    <div v-else class="p-4">
      <fieldset class="fieldset">
        <div class="flex gap-2 flex-wrap">
          <label class="select select-sm w-66">
            <span class="label">{{ t('export.format') }}</span>
            <select v-model="selectedFormatKey">
              <option
                v-for="exportConfig in exportConfigs"
                :key="exportConfig.name"
                :value="exportConfig.name"
              >
                {{ exportConfig.name }}
              </option>
              <option v-if="graphSvgRenderer" :value="WYSIWYG_SVG_KEY">
                {{ t('export.svgImage') }}
              </option>
            </select>
          </label>
          <a
            v-if="selectedExportConfig?.references?.[0]"
            :href="selectedExportConfig.references[0].url"
            :title="selectedExportConfig.references[0].label"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm btn-ghost btn-square self-end"
          >
            <ArrowTopRightOnSquareIcon class="size-4" />
          </a>
        </div>
      </fieldset>
      <fieldset v-if="selectedExportConfig?.name === 'LaTeX (argumentation)'" class="fieldset">
        <details class="collapse collapse-arrow">
          <summary class="collapse-title fieldset-legend ps-0 max-w-max">
            {{ t('export.style.parameters') }}
          </summary>
          <div class="collapse-content px-4 pb-4 pt-2">
            <div class="flex gap-2 flex-wrap">
              <label class="select select-sm w-66">
                <span class="label">{{ t('export.style.argumentStyle') }}</span>
                <select v-model="selectedArgumentStyle">
                  <option value="standard">standard</option>
                  <option value="large">large</option>
                  <option value="thick">thick</option>
                  <option value="gray">gray</option>
                  <option value="colored">colored</option>
                </select>
              </label>
              <label class="select select-sm w-66">
                <span class="label">{{ t('export.style.nameStyle') }}</span>
                <select v-model="selectedNameStyle">
                  <option value="math">math</option>
                  <option value="bold">bold</option>
                  <option value="monospace">monospace</option>
                  <option value="monoemph">monoemph</option>
                  <option value="none">none</option>
                </select>
              </label>
              <label class="select select-sm w-66">
                <span class="label">{{ t('export.style.attackStyle') }}</span>
                <select v-model="selectedAttackStyle">
                  <option value="standard">standard</option>
                  <option value="large">large</option>
                  <option value="modern">modern</option>
                </select>
              </label>
              <label v-if="isBipolarDocument" class="select select-sm w-66">
                <span class="label">{{ t('export.style.supportStyle') }}</span>
                <select v-model="selectedSupportStyle">
                  <option value="standard">standard</option>
                  <option value="dashed">dashed</option>
                  <option value="double">double</option>
                </select>
              </label>
            </div>
            <div class="mt-4 flex flex-wrap gap-4 items-center">
              <label class="label gap-2">
                <span>{{ t('export.style.nodeDistance') }}</span>
                <input
                  type="range"
                  class="range range-sm w-28"
                  min="0.5"
                  max="4"
                  step="0.25"
                  v-model.number="selectedNodeDistance"
                />
                <span class="text-sm w-6 text-right opacity-60">{{ selectedNodeDistance }}</span>
              </label>
            </div>
          </div>
        </details>
        <div class="relative mt-2 w-fit max-w-md">
          <input
            type="text"
            class="input input-xs font-mono max-w-md pr-8 field-sizing-content"
            readonly
            :value="usePackageLine"
          />
          <button
            class="absolute right-1 top-1/2 -translate-y-1/2 btn btn-xs btn-ghost btn-square"
            :disabled="usePackageLine === undefined"
            @click="copyPackageLine"
          >
            <ClipboardDocumentCheckIcon v-if="packageLineCopied" class="size-3.5" />
            <ClipboardDocumentIcon v-else class="size-3.5" />
          </button>
        </div>
      </fieldset>
      <div v-if="isWysiwygSvg" class="flex flex-col gap-2">
        <div class="flex gap-2 flex-wrap">
          <ButtonSave
            class="btn btn-sm btn-soft w-28 justify-start"
            :filedata="saveFiledataWysiwygSvg"
            @export="emit('export', $event)"
          >
            SVG
          </ButtonSave>
          <ButtonCopy class="btn btn-sm btn-soft w-28 justify-start" :text="wysiwygSvgText">
            SVG
          </ButtonCopy>
        </div>
        <div
          v-if="wysiwygSvgText"
          v-html="wysiwygSvgText"
          class="wysiwyg-svg-preview w-fit max-w-full overflow-auto rounded border border-base-300 p-1"
        ></div>
        <div v-else role="alert" class="alert alert-warning alert-soft">
          <span>{{ t('export.noGraph') }}</span>
        </div>
      </div>
      <div v-else class="flex gap-2 flex-wrap">
        <div class="grow max-w-80">
          <fieldset class="fieldset">
            <div class="flex gap-2 flex-wrap mb-2">
              <ButtonSave
                class="btn btn-sm btn-soft w-28 justify-start"
                :filedata="saveFiledataText"
                @export="emit('export', $event)"
              >
                {{ t('export.formatLabels.text') }}
              </ButtonSave>
              <ButtonCopy class="btn btn-sm btn-soft w-28 justify-start" :text="exportResult?.text">
                {{ t('export.formatLabels.text') }}
              </ButtonCopy>
            </div>
            <div class="min-w-58 bg-base-100 rounded" ref="soureView"></div>
          </fieldset>
        </div>
        <div v-if="exportResult?.svg !== undefined" v-show="exportResult !== undefined">
          <fieldset class="fieldset">
            <div class="flex gap-2 flex-wrap mb-2">
              <ButtonSave
                class="btn btn-sm btn-soft w-28 justify-start"
                :filedata="saveFiledataSvg"
                @export="emit('export', $event)"
              >
                SVG
              </ButtonSave>
              <ButtonCopy class="btn btn-sm btn-soft w-28 justify-start" :text="svgText">
                SVG
              </ButtonCopy>
            </div>
            <div>
              <div v-if="svgText === undefined" role="alert" class="alert alert-info alert-soft">
                <span>{{ t('export.renderingSvg') }}</span>
              </div>
              <div v-else v-html="svgText" class="w-fit bg-base-100 rounded p-1"></div>
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  </WindowShell>
</template>
<style scoped>
:deep(.cm-editor) {
  background-color: var(--color-base-100);
  color: var(--color-base-content);
}
:deep(.cm-content) {
  color: var(--color-base-content);
}
:deep(.cm-gutters) {
  background-color: var(--color-base-100);
}
:deep(.cm-tooltip) {
  display: none;
}

/* Cap the WYSIWYG SVG preview: the serialized svg has intrinsic px dimensions that grow with
   the graph, so clamp it (its viewBox keeps the aspect ratio) instead of letting it scale up. */
.wysiwyg-svg-preview :deep(svg) {
  max-width: 100%;
  max-height: 60vh;
  width: auto;
  height: auto;
}
</style>
