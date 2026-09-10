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
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { DocumentId } from '@/modules/common/documents/db'
import type { Input } from '@/modules/common/evaluation/types'
import WindowShell from '@/modules/common/window/WindowShell.vue'
import type {
  PafArgumentData,
  ProbabilisticArgumentation,
} from '@/modules/probabilistic-argumentation/model'

const open = defineModel<boolean>('open', { required: true })
const { input, documentId, stateKey, focusKey } = defineProps<{
  input: Input<ProbabilisticArgumentation<PafArgumentData>>
  documentId?: DocumentId
  stateKey?: string
  /** `arg-<id>` or `atk-<src>-<tgt>`: scroll that row into view and flash it. */
  focusKey?: string
}>()

const emit = defineEmits<{
  changeArgumentProbability: [id: number, probability: number]
  changeAttackProbability: [sourceId: number, targetId: number, probability: number]
}>()

const { t } = useI18n({ useScope: 'global' })

const argumentList = computed(() => {
  return [...input.content.arguments()].map(([id, data]) => ({
    id,
    name: data.name,
    probability: data.probability,
  }))
})

const attackList = computed(() => {
  const argNames = new Map<number, string>()
  for (const [id, data] of input.content.arguments()) {
    argNames.set(id, data.name)
  }
  return [...input.content.attacks()].map(([sourceId, targetId, probability]) => ({
    sourceId,
    targetId,
    sourceName: argNames.get(sourceId) ?? String(sourceId),
    targetName: argNames.get(targetId) ?? String(targetId),
    probability,
  }))
})

function onArgumentProbabilityInput(id: number, event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value)
  if (!isNaN(value) && value >= 0 && value <= 1) {
    emit('changeArgumentProbability', id, value)
  }
}

function onAttackProbabilityInput(sourceId: number, targetId: number, event: Event) {
  const value = parseFloat((event.target as HTMLInputElement).value)
  if (!isNaN(value) && value >= 0 && value <= 1) {
    emit('changeAttackProbability', sourceId, targetId, value)
  }
}

// Row-jump: when the editor opens (or the target changes) from a node/attack tap,
// scroll the matching row into view and briefly flash it.
const bodyRef = useTemplateRef<HTMLDivElement>('body')
const flashKey = ref<string | undefined>(undefined)

watch(
  [open, () => focusKey],
  ([isOpen, key]) => {
    if (!isOpen || key === undefined) return
    void nextTick(() => {
      const row = bodyRef.value?.querySelector(`[data-row-key="${CSS.escape(key)}"]`)
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      flashKey.value = key
      setTimeout(() => {
        if (flashKey.value === key) flashKey.value = undefined
      }, 1200)
    })
  },
  { flush: 'post' },
)
</script>

<template>
  <WindowShell
    v-model:open="open"
    :title="t('editor.probabilities.title')"
    :initial-position="{ x: 128, y: 64 }"
    :intitalSize="{ width: 360, height: 300 }"
    :document-id="documentId"
    :state-key="stateKey"
  >
    <div ref="body" class="p-2 flex flex-col gap-2 overflow-y-auto h-full">
      <fieldset class="fieldset" v-if="argumentList.length > 0">
        <legend class="fieldset-legend">{{ t('editor.probabilities.arguments') }}</legend>
        <div class="flex flex-col gap-0.5">
          <div
            v-for="arg in argumentList"
            :key="arg.id"
            :data-row-key="`arg-${arg.id}`"
            class="flex items-center gap-2 rounded-field px-1 transition-colors"
            :class="{ 'bg-primary/15': flashKey === `arg-${arg.id}` }"
          >
            <span class="w-8 text-right font-mono text-xs shrink-0">{{ arg.name }}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="range range-xs flex-1"
              :value="arg.probability"
              @input="onArgumentProbabilityInput(arg.id, $event)"
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              class="input input-xs w-16 text-right font-mono"
              :value="arg.probability"
              @change="onArgumentProbabilityInput(arg.id, $event)"
            />
          </div>
        </div>
      </fieldset>

      <fieldset class="fieldset" v-if="attackList.length > 0">
        <legend class="fieldset-legend">{{ t('editor.probabilities.attacks') }}</legend>
        <div class="flex flex-col gap-0.5">
          <div
            v-for="atk in attackList"
            :key="`${atk.sourceId}-${atk.targetId}`"
            :data-row-key="`atk-${atk.sourceId}-${atk.targetId}`"
            class="flex items-center gap-2 rounded-field px-1 transition-colors"
            :class="{ 'bg-primary/15': flashKey === `atk-${atk.sourceId}-${atk.targetId}` }"
          >
            <span class="w-16 text-right font-mono text-xs shrink-0"
              >{{ atk.sourceName }} → {{ atk.targetName }}</span
            >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="range range-xs flex-1"
              :value="atk.probability"
              @input="onAttackProbabilityInput(atk.sourceId, atk.targetId, $event)"
            />
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              class="input input-xs w-16 text-right font-mono"
              :value="atk.probability"
              @change="onAttackProbabilityInput(atk.sourceId, atk.targetId, $event)"
            />
          </div>
        </div>
      </fieldset>

      <p v-if="argumentList.length === 0" class="text-sm text-base-content/50">
        {{ t('editor.probabilities.empty') }}
      </p>
    </div>
  </WindowShell>
</template>
