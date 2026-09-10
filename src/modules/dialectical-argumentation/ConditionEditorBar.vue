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
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { NodeId } from '@/modules/common/graph-editor/graphEditor'
import {
  type FormulaNode,
  formulaToString,
} from '@/modules/dialectical-argumentation/condition/formula'
import { parseFormula } from '@/modules/dialectical-argumentation/condition/formulaParser'
import type {
  AdfArgumentData,
  DialecticalArgumentation,
} from '@/modules/dialectical-argumentation/model'

const props = defineProps<{
  argumentId: NodeId
  adf: DialecticalArgumentation<AdfArgumentData>
  x: number
  y: number
}>()

const emit = defineEmits<{
  'update:formula': [FormulaNode]
  close: []
}>()

const { t } = useI18n({ useScope: 'global' })

const inputRef = useTemplateRef<HTMLInputElement>('input')
const isFocused = ref(false)

const argNameMap = computed(() => {
  const map = new Map<number, string>()
  for (const [id, data] of props.adf.arguments()) map.set(id, data.name)
  return map
})

const argNameToId = computed(() => {
  const map = new Map<string, number>()
  for (const [id, data] of props.adf.arguments()) map.set(data.name, id)
  return map
})

const availableArguments = computed(() => {
  const result: { id: number; name: string }[] = []
  for (const [id, data] of props.adf.arguments()) result.push({ id, name: data.name })
  return result
})

const inputText = ref(
  formulaToString(props.adf.getArgument(props.argumentId).condition, argNameMap.value),
)

onMounted(() => inputRef.value?.focus())
const isInvalid = ref(false)

watch([() => props.adf, () => props.argumentId], () => {
  if (isFocused.value) return
  try {
    inputText.value = formulaToString(
      props.adf.getArgument(props.argumentId).condition,
      argNameMap.value,
    )
    isInvalid.value = false
  } catch {
    // argument may not exist during deletion
  }
})

function parseAndEmit() {
  const parsed = parseFormula(inputText.value, argNameToId.value)
  if (parsed !== null) {
    isInvalid.value = false
    emit('update:formula', parsed)
  } else {
    isInvalid.value = inputText.value.trim().length > 0
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === '|') {
    e.preventDefault()
    insertAtCursor(' ∨ ')
  } else if (e.key === '&') {
    e.preventDefault()
    insertAtCursor(' ∧ ')
  } else if (e.key === '!') {
    e.preventDefault()
    insertAtCursor('¬')
  }
}

function onBlur() {
  isFocused.value = false
  isInvalid.value = false
}

function insertAtCursor(text: string, cursorOffset?: number) {
  const el = inputRef.value
  const start = el?.selectionStart ?? inputText.value.length
  const end = el?.selectionEnd ?? start
  const newText = inputText.value.slice(0, start) + text + inputText.value.slice(end)
  const newPos = start + (cursorOffset ?? text.length)
  // Write to DOM first so Vue's vModelText sees el.value === inputText and skips
  // its own DOM write, which would otherwise reset the cursor position.
  if (el) {
    el.value = newText
    el.setSelectionRange(newPos, newPos)
  }
  inputText.value = newText
  parseAndEmit()
}
</script>

<template>
  <div
    class="absolute z-50 bg-base-100 border border-base-300 shadow-md rounded-xl pointer-events-auto min-w-72"
    :style="{ left: x + 'px', top: y + 'px', transform: 'translateY(calc(-100% - 8px))' }"
    @click.stop
    @keydown.esc.stop="emit('close')"
    @keydown.enter.stop="emit('close')"
  >
    <div class="px-3 py-2 flex flex-col gap-1.5">
      <!-- Operator keypad + argument dropdown, above the input -->
      <div class="flex items-center gap-1.5">
        <div class="inline-flex h-7 overflow-hidden rounded-lg border border-base-300">
          <button
            class="flex h-full w-8 items-center justify-center border-r border-base-300 font-mono text-sm transition-colors hover:bg-base-200"
            type="button"
            :title="`${t('editor.condition.keys.negation')} (¬)`"
            @mousedown.prevent
            @click="insertAtCursor('¬')"
          >
            ¬
          </button>
          <button
            class="flex h-full w-8 items-center justify-center border-r border-base-300 font-mono text-sm transition-colors hover:bg-base-200"
            type="button"
            :title="`${t('editor.condition.keys.conjunction')} (∧)`"
            @mousedown.prevent
            @click="insertAtCursor(' ∧ ')"
          >
            ∧
          </button>
          <button
            class="flex h-full w-8 items-center justify-center border-r border-base-300 font-mono text-sm transition-colors hover:bg-base-200"
            type="button"
            :title="`${t('editor.condition.keys.disjunction')} (∨)`"
            @mousedown.prevent
            @click="insertAtCursor(' ∨ ')"
          >
            ∨
          </button>
          <button
            class="flex h-full w-8 items-center justify-center border-r border-base-300 font-mono text-sm transition-colors hover:bg-base-200"
            type="button"
            :title="`${t('editor.condition.keys.tautology')} (⊤)`"
            @mousedown.prevent
            @click="insertAtCursor('⊤')"
          >
            ⊤
          </button>
          <button
            class="flex h-full w-8 items-center justify-center border-r border-base-300 font-mono text-sm transition-colors hover:bg-base-200"
            type="button"
            :title="`${t('editor.condition.keys.contradiction')} (⊥)`"
            @mousedown.prevent
            @click="insertAtCursor('⊥')"
          >
            ⊥
          </button>
          <button
            class="flex h-full w-8 items-center justify-center font-mono text-sm transition-colors hover:bg-base-200"
            type="button"
            :title="t('editor.condition.keys.parentheses')"
            @mousedown.prevent
            @click="insertAtCursor('()', 1)"
          >
            ( )
          </button>
        </div>

        <!-- Atom button: expands on hover to show all arguments -->
        <div class="dropdown dropdown-hover dropdown-top">
          <button
            tabindex="0"
            class="flex h-7 items-center rounded-lg border border-base-300 px-2.5 text-sm transition-colors hover:bg-base-200"
            type="button"
            @mousedown.prevent
          >
            {{ t('editor.condition.atom') }} ▾
          </button>
          <ul
            class="dropdown-content bg-base-200 shadow-lg rounded-box p-1 flex flex-col items-start gap-1 mb-1 max-h-40 overflow-y-auto z-50"
          >
            <li v-for="arg in availableArguments" :key="arg.id">
              <button
                class="btn btn-xs btn-ghost font-mono"
                type="button"
                @mousedown.prevent
                @click="insertAtCursor(arg.name)"
              >
                {{ arg.name }}
              </button>
            </li>
            <li
              v-if="availableArguments.length === 0"
              class="text-xs text-base-content/50 px-2 py-1"
            >
              {{ t('editor.condition.noArguments') }}
            </li>
          </ul>
        </div>

        <button
          class="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-base-content/60 transition-colors hover:bg-base-200 hover:text-base-content"
          type="button"
          :aria-label="t('common.actions.close')"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="relative">
        <input
          ref="input"
          type="text"
          class="input input-sm input-bordered font-mono w-full"
          :class="{ 'input-error': isInvalid, 'pr-8': isInvalid }"
          v-model="inputText"
          @input="parseAndEmit"
          @keydown="onKeydown"
          @focus="isFocused = true"
          @blur="onBlur"
        />
        <span
          v-if="isInvalid"
          class="tooltip tooltip-left absolute right-2 top-1/2 -translate-y-1/2 text-error select-none cursor-default"
          :data-tip="t('editor.condition.syntaxError')"
        >
          <ExclamationCircleIcon class="size-5" />
        </span>
      </div>
    </div>
  </div>
</template>
