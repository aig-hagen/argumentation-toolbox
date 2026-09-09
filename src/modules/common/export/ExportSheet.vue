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
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  PhotoIcon,
  ShareIcon,
} from '@heroicons/vue/24/outline'
import { computed, inject, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ButtonCopy from '@/modules/common/export/ButtonCopy.vue'
import ButtonSave from '@/modules/common/export/ButtonSave.vue'
import { GRAPH_SVG_RENDERER_KEY } from '@/modules/common/graph-editor/graphEditor'
import { useSettings } from '@/modules/common/settings/useSettings'
import { supportsNativeShare } from '@/modules/common/share/nativeShare'
import { QUICK_SHARE_KEY } from '@/modules/common/share/quickShareKey'

import type { ExportConfig, ExportFileData, ExportStyleOptions } from '.'

const { input, exportConfigs } = defineProps<{
  input: DocumentT
  exportConfigs: ExportConfig<DocumentT>[]
}>()

const emit = defineEmits<{ export: [filedata: ExportFileData]; close: [] }>()

const { t } = useI18n({ useScope: 'global' })

function shareAndClose() {
  quickShare?.()
  emit('close')
}

const { gridCellScale } = useSettings()
const quickShare = inject(QUICK_SHARE_KEY, undefined)
const graphSvgRenderer = inject(GRAPH_SVG_RENDERER_KEY, undefined)
const canShareNatively = supportsNativeShare()

type Screen = 'picker' | 'svg' | 'code'
const screen = ref<Screen>('picker')

// Appearance options change the package line and rendered SVG but not the TikZ body;
// structure options change TikZ coordinates as well as the SVG.
const argumentStyle = shallowRef('standard')
const nameStyle = shallowRef('math')
const attackStyle = shallowRef('standard')
const supportStyle = shallowRef('double')
const nodeDistance = shallowRef(1.5)

const isBipolarDocument = computed(
  () => typeof (input as unknown as { supports?: unknown }).supports === 'function',
)

const styleOptions = computed<ExportStyleOptions>(() => ({
  argumentStyle: argumentStyle.value,
  nameStyle: nameStyle.value,
  attackStyle: attackStyle.value,
  supportStyle: supportStyle.value,
  nodeDistance: nodeDistance.value,
  gridCellScale: gridCellScale.value,
}))

// The config with a code editor (LaTeX) is both the code view and the SVG source;
// the rest (ICCMA, TGF) are plain data downloads.
const codeConfig = computed(() => exportConfigs.find((c) => c.codemirrorOptions !== undefined))
const dataConfigs = computed(() => exportConfigs.filter((c) => c.codemirrorOptions === undefined))

const codeResult = computed(() =>
  codeConfig.value === undefined ? undefined : codeConfig.value.export(input, styleOptions.value),
)

const packageLine = computed(() => {
  if (codeConfig.value?.name !== 'LaTeX (argumentation)') return undefined
  const opts = [
    ...(argumentStyle.value !== 'standard' ? [`argumentstyle=${argumentStyle.value}`] : []),
    `namestyle=${nameStyle.value}`,
    ...(attackStyle.value !== 'standard' ? [`attackstyle=${attackStyle.value}`] : []),
  ]
  if (isBipolarDocument.value) opts.push(`supportstyle=${supportStyle.value}`)
  return `\\usepackage[${opts.join(',')}]{argumentation}`
})

// WYSIWYG SVG snapshot of the live graph. Serialized only on the preview screen, and only when
// a renderer is provided (i.e. inside a graph editor). No TikZ/WebAssembly, so it works on any
// phone — unlike the old rendered preview, which could hang on mobile. Re-serialized on document
// changes via a post-flush watch so the snapshot reflects edits (e.g. moved nodes), reading the
// canvas after it has re-rendered rather than the pre-edit positions.
const svgText = shallowRef<string | undefined>(undefined)
watch(
  [screen, () => input],
  ([currentScreen]) => {
    svgText.value = currentScreen === 'svg' ? (graphSvgRenderer?.() ?? undefined) : undefined
  },
  { immediate: true, flush: 'post' },
)

const svgFiledata = computed<ExportFileData | undefined>(() =>
  svgText.value === undefined ? undefined : { content: svgText.value, ending: 'svg' },
)
const codeFiledata = computed<ExportFileData | undefined>(() =>
  codeResult.value === undefined
    ? undefined
    : { content: codeResult.value.text, ending: codeConfig.value?.extension ?? 'tex' },
)

function download(config: ExportConfig<DocumentT>) {
  emit('export', {
    content: config.export(input, styleOptions.value).text,
    ending: config.extension ?? 'txt',
  })
}
</script>

<template>
  <div class="pb-4">
    <!-- Format picker -->
    <div v-if="screen === 'picker'" class="flex flex-col gap-5">
      <!-- One-tap share, kept apart from the format flow. -->
      <button
        v-if="quickShare"
        class="flex items-center gap-3 h-14 px-4 rounded-2xl bg-primary text-primary-content shadow-md shadow-primary/30"
        @click="shareAndClose()"
      >
        <ShareIcon class="size-5" />
        <span class="flex-1 text-left font-semibold">{{
          canShareNatively ? t('menu.shareLink') : t('home.tabs.copyShareLink')
        }}</span>
      </button>

      <section v-if="graphSvgRenderer" class="flex flex-col gap-2">
        <h3 class="text-[0.7rem] font-semibold uppercase tracking-wide text-base-content/50 px-1">
          {{ t('export.sections.image') }}
        </h3>
        <button
          class="w-full flex items-center gap-3 min-h-14 px-3.5 py-2 rounded-2xl border border-base-300 bg-base-100 text-left"
          @click="screen = 'svg'"
        >
          <span class="grid place-items-center size-9 shrink-0 rounded-lg bg-base-200">
            <PhotoIcon class="size-5 text-primary" />
          </span>
          <span class="flex-1 min-w-0 flex flex-col leading-tight">
            <b class="text-sm font-semibold">{{ t('export.svg.title') }}</b>
            <span class="text-xs text-base-content/60 truncate">{{
              t('export.svg.description')
            }}</span>
          </span>
          <ChevronRightIcon class="size-4 shrink-0 opacity-30" />
        </button>
      </section>

      <section class="flex flex-col gap-2">
        <h3 class="text-[0.7rem] font-semibold uppercase tracking-wide text-base-content/50 px-1">
          {{ t('export.sections.text') }}
        </h3>
        <button
          v-if="codeConfig"
          class="w-full flex items-center gap-3 min-h-14 px-3.5 py-2 rounded-2xl border border-base-300 bg-base-100 text-left"
          @click="screen = 'code'"
        >
          <span class="grid place-items-center size-9 shrink-0 rounded-lg bg-base-200">
            <CodeBracketIcon class="size-5 text-primary" />
          </span>
          <span class="flex-1 min-w-0 flex flex-col leading-tight">
            <b class="text-sm font-semibold">{{ codeConfig.name }}</b>
            <span class="text-xs text-base-content/60 truncate">{{
              codeConfig.description ?? t('export.latexFallbackDescription')
            }}</span>
          </span>
          <ChevronRightIcon class="size-4 shrink-0 opacity-30" />
        </button>
        <button
          v-for="config in dataConfigs"
          :key="config.name"
          class="w-full flex items-center gap-3 min-h-14 px-3.5 py-2 rounded-2xl border border-base-300 bg-base-100 text-left"
          @click="download(config)"
        >
          <span class="grid place-items-center size-9 shrink-0 rounded-lg bg-base-200">
            <DocumentTextIcon class="size-5 text-primary" />
          </span>
          <span class="flex-1 min-w-0 flex flex-col leading-tight">
            <b class="text-sm font-semibold">{{ config.name }}</b>
            <span class="text-xs text-base-content/60 truncate">{{
              config.description ?? t('export.fileFallbackDescription', { ext: config.extension })
            }}</span>
          </span>
          <ArrowDownTrayIcon class="size-5 shrink-0 opacity-40" />
        </button>
      </section>
    </div>

    <!-- SVG preview -->
    <div v-else-if="screen === 'svg'" class="flex flex-col gap-3">
      <button class="btn btn-sm btn-ghost self-start gap-1 -ml-1" @click="screen = 'picker'">
        <ChevronLeftIcon class="size-4" /> {{ t('export.formats') }}
      </button>

      <div class="overflow-auto rounded border border-base-300 p-2">
        <div v-if="svgText" v-html="svgText" class="wysiwyg-svg-preview w-fit"></div>
        <div v-else role="alert" class="alert alert-warning alert-soft">
          <span>{{ t('export.noGraph') }}</span>
        </div>
      </div>

      <div class="flex gap-2">
        <ButtonSave
          class="btn btn-sm btn-soft flex-1"
          :filedata="svgFiledata"
          @export="emit('export', $event)"
        />
        <ButtonCopy class="btn btn-sm btn-soft flex-1" :text="svgText">SVG</ButtonCopy>
      </div>
    </div>

    <!-- LaTeX code -->
    <div v-else class="flex flex-col gap-3">
      <button class="btn btn-sm btn-ghost self-start gap-1 -ml-1" @click="screen = 'picker'">
        <ChevronLeftIcon class="size-4" /> {{ t('export.formats') }}
      </button>

      <div class="flex items-center gap-2">
        <a
          v-if="codeConfig?.references?.[0]"
          :href="codeConfig.references[0].url"
          :title="codeConfig.references[0].label"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-sm btn-ghost btn-square"
        >
          <ArrowTopRightOnSquareIcon class="size-4" />
        </a>
        <ButtonSave
          class="btn btn-sm btn-soft flex-1"
          :filedata="codeFiledata"
          @export="emit('export', $event)"
        />
        <ButtonCopy class="btn btn-sm btn-soft flex-1" :text="codeResult?.text">{{
          t('export.formatLabels.code')
        }}</ButtonCopy>
      </div>

      <div v-if="packageLine" class="flex items-center gap-2">
        <code class="flex-1 min-w-0 truncate rounded bg-base-200 px-2 py-1.5 text-[0.7rem]">{{
          packageLine
        }}</code>
        <ButtonCopy class="btn btn-xs btn-ghost btn-square" :text="packageLine" icon-only tex />
      </div>

      <pre
        class="overflow-auto rounded bg-base-200 p-2 text-[0.7rem] leading-relaxed max-h-64"
      ><code>{{ codeResult?.text }}</code></pre>

      <details v-if="packageLine" class="collapse collapse-arrow bg-base-200/60 rounded-field">
        <summary class="collapse-title text-sm font-medium">
          {{ t('export.style.options') }}
        </summary>
        <div class="collapse-content flex flex-col gap-3">
          <div class="grid grid-cols-2 gap-2">
            <label class="select select-sm">
              <span class="label">{{ t('export.style.argument') }}</span>
              <select v-model="argumentStyle">
                <option>standard</option>
                <option>large</option>
                <option>thick</option>
                <option>gray</option>
                <option>colored</option>
              </select>
            </label>
            <label class="select select-sm">
              <span class="label">{{ t('export.style.name') }}</span>
              <select v-model="nameStyle">
                <option>math</option>
                <option>bold</option>
                <option>monospace</option>
                <option>monoemph</option>
                <option>none</option>
              </select>
            </label>
            <label class="select select-sm">
              <span class="label">{{ t('export.style.attack') }}</span>
              <select v-model="attackStyle">
                <option>standard</option>
                <option>large</option>
                <option>modern</option>
              </select>
            </label>
            <label v-if="isBipolarDocument" class="select select-sm">
              <span class="label">{{ t('export.style.support') }}</span>
              <select v-model="supportStyle">
                <option>standard</option>
                <option>dashed</option>
                <option>double</option>
              </select>
            </label>
          </div>
          <label class="label gap-2">
            <span>{{ t('export.style.nodeDistance') }}</span>
            <input
              type="range"
              class="range range-sm flex-1"
              min="0.5"
              max="4"
              step="0.25"
              v-model.number="nodeDistance"
            />
            <span class="text-sm w-6 text-right opacity-60">{{ nodeDistance }}</span>
          </label>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
/* Cap the WYSIWYG SVG preview: the serialized svg has intrinsic px dimensions that grow with
   the graph, so clamp it (its viewBox keeps the aspect ratio) instead of letting it scale up. */
.wysiwyg-svg-preview :deep(svg) {
  max-width: 100%;
  max-height: 60vh;
  width: auto;
  height: auto;
}
</style>
