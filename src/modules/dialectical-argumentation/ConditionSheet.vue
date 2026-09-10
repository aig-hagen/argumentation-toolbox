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
import { BackspaceIcon } from '@heroicons/vue/24/outline'
import { ExclamationCircleIcon } from '@heroicons/vue/24/solid'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { NodeId } from '@/modules/common/graph-editor/graphEditor'
import BottomSheet from '@/modules/common/window/BottomSheet.vue'
import {
  type FormulaNode,
  formulaToString,
} from '@/modules/dialectical-argumentation/condition/formula'
import { parseFormula } from '@/modules/dialectical-argumentation/condition/formulaParser'
import type {
  AdfArgumentData,
  DialecticalArgumentation,
} from '@/modules/dialectical-argumentation/model'

const open = defineModel<boolean>('open', { required: true })
const { argumentId, adf } = defineProps<{
  argumentId: NodeId | null
  adf: DialecticalArgumentation<AdfArgumentData>
}>()

const emit = defineEmits<{
  'update:formula': [FormulaNode]
}>()

const argNameMap = computed(() => {
  const map = new Map<number, string>()
  for (const [id, data] of adf.arguments()) map.set(id, data.name)
  return map
})
const argNameToId = computed(() => {
  const map = new Map<string, number>()
  for (const [id, data] of adf.arguments()) map.set(data.name, id)
  return map
})
const availableArguments = computed(() =>
  [...adf.arguments()].map(([id, data]) => ({ id, name: data.name })),
)

const argName = computed(() =>
  argumentId !== null ? (argNameMap.value.get(argumentId) ?? '') : '',
)
const { t } = useI18n({ useScope: 'global' })

const sheetTitle = computed(() =>
  argName.value
    ? t('editor.condition.titleOf', { name: argName.value })
    : t('editor.condition.title'),
)

const inputRef = useTemplateRef<HTMLInputElement>('input')
const inputText = ref('')
const isInvalid = ref(false)

// Re-seed the field whenever the sheet targets a (different) argument.
watch(
  [open, () => argumentId],
  ([isOpen, id]) => {
    if (!isOpen || id === null) return
    try {
      inputText.value = formulaToString(adf.getArgument(id).condition, argNameMap.value)
      isInvalid.value = false
    } catch {
      inputText.value = ''
    }
  },
  { immediate: true },
)

function parseAndEmit() {
  if (argumentId === null) return
  const parsed = parseFormula(inputText.value, argNameToId.value)
  if (parsed !== null) {
    isInvalid.value = false
    emit('update:formula', parsed)
  } else {
    isInvalid.value = inputText.value.trim().length > 0
  }
}

function insertAtCursor(text: string, cursorOffset?: number) {
  const el = inputRef.value
  const start = el?.selectionStart ?? inputText.value.length
  const end = el?.selectionEnd ?? start
  const newText = inputText.value.slice(0, start) + text + inputText.value.slice(end)
  const newPos = start + (cursorOffset ?? text.length)
  if (el) {
    el.value = newText
    el.setSelectionRange(newPos, newPos)
    el.focus()
  }
  inputText.value = newText
  parseAndEmit()
}

function deleteAtCursor() {
  const el = inputRef.value
  const start = el?.selectionStart ?? inputText.value.length
  const end = el?.selectionEnd ?? start
  // Collapsed caret deletes the char before it; a selection deletes the range.
  const from = start === end ? Math.max(0, start - 1) : start
  const newText = inputText.value.slice(0, from) + inputText.value.slice(end)
  if (el) {
    el.value = newText
    el.setSelectionRange(from, from)
    el.focus()
  }
  inputText.value = newText
  parseAndEmit()
}

function clearFormula() {
  inputText.value = ''
  if (inputRef.value) inputRef.value.value = ''
  parseAndEmit()
  void nextTick(() => inputRef.value?.focus())
}

const operatorKeys = computed(() => [
  { label: '¬', text: '¬', title: t('editor.condition.keys.negation') },
  { label: '∧', text: ' ∧ ', title: t('editor.condition.keys.conjunction') },
  { label: '∨', text: ' ∨ ', title: t('editor.condition.keys.disjunction') },
  { label: '⊤', text: '⊤', title: t('editor.condition.keys.tautology') },
  { label: '⊥', text: '⊥', title: t('editor.condition.keys.contradiction') },
  { label: '( )', text: '()', title: t('editor.condition.keys.parentheses'), cursorOffset: 1 },
])
</script>

<template>
  <BottomSheet v-model:open="open" :title="sheetTitle">
    <div class="flex flex-col gap-4 pt-1.5 pb-4">
      <!-- Condition input with an attached backspace, like a keyboard -->
      <div class="flex flex-col gap-1.5">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              ref="input"
              type="text"
              inputmode="none"
              class="input h-12 w-full rounded-xl border-base-300 bg-base-100 font-mono"
              :class="{ 'input-error pr-10': isInvalid }"
              v-model="inputText"
              @input="parseAndEmit"
            />
            <span
              v-if="isInvalid"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-error select-none"
              :title="t('editor.condition.syntaxError')"
            >
              <ExclamationCircleIcon class="size-5" />
            </span>
          </div>
          <button
            type="button"
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-base-300 bg-base-200 text-base-content transition-colors hover:bg-base-300"
            :aria-label="t('editor.condition.backspace')"
            :title="t('editor.condition.backspace')"
            @click="deleteAtCursor"
          >
            <BackspaceIcon class="size-5" />
          </button>
        </div>
        <p class="text-xs opacity-50">{{ t('editor.condition.hint') }}</p>
      </div>

      <!-- Operator keypad -->
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold uppercase opacity-60">{{
          t('editor.condition.operators')
        }}</span>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="key in operatorKeys"
            :key="key.label"
            type="button"
            class="flex h-12 items-center justify-center rounded-xl border-2 border-base-300 bg-base-100 font-mono text-lg text-base-content transition-colors hover:bg-base-200 active:bg-base-300"
            :title="key.title"
            :aria-label="key.title"
            @click="insertAtCursor(key.text, key.cursorOffset)"
          >
            {{ key.label }}
          </button>
        </div>
      </div>

      <!-- Argument atom chips -->
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold uppercase opacity-60">{{
          t('editor.condition.arguments')
        }}</span>
        <div v-if="availableArguments.length > 0" class="flex flex-wrap gap-1.5">
          <button
            v-for="arg in availableArguments"
            :key="arg.id"
            type="button"
            class="btn btn-sm rounded-lg btn-soft btn-primary font-mono"
            @click="insertAtCursor(arg.name)"
          >
            {{ arg.name }}
          </button>
        </div>
        <p v-else class="text-xs opacity-50">{{ t('editor.condition.referenceEmpty') }}</p>
      </div>

      <!-- Clear: always present so clearing doesn't shift the sheet -->
      <div class="flex justify-end">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="inputText.length === 0"
          @click="clearFormula"
        >
          {{ t('editor.condition.clearAll') }}
        </button>
      </div>
    </div>
  </BottomSheet>
</template>
