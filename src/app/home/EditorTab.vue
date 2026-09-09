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
<script setup lang="ts" generic="DocumentT extends Objectish">
import { ArrowDownTrayIcon, TrashIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useDebounceFn } from '@vueuse/core'
import type { IDBPDatabase } from 'idb'
import type { Objectish } from 'immer'
import { computed, nextTick, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ModuleConfig } from '@/app/home/moduleConfig'
import type { DocumentsDB } from '@/modules/common/documents/db'
import { loadDocumentState } from '@/modules/common/documents/useDocuments'

const { t } = useI18n({ useScope: 'global' })
const PLACEHOLDER = computed(() => t('home.tab.placeholder'))

const { active, documentId, value, db, modules } = defineProps<{
  active: boolean
  value: string
  documentId: number
  db: IDBPDatabase<DocumentsDB>
  modules: ModuleConfig<DocumentT>[]
}>()

const emit = defineEmits<{
  rename: [name: string]
  delete: []
  select: []
  save: []
}>()

const debouncedRename = useDebounceFn((name) => {
  emit('rename', name)
}, 300)

function getInputSizerValue(value: string) {
  if (value !== '') {
    return value
  }
  return PLACEHOLDER.value
}

function handleInput(e: InputEvent) {
  const target = e.target as HTMLInputElement
  inputSizerRef.value!.dataset.value = getInputSizerValue(target.value)
  debouncedRename(target.value)
}

async function doRequestClose() {
  const [state] = await loadDocumentState(db, modules, documentId)
  if (state === undefined) {
    emit('delete')
  }
  closeModal.value?.showModal()
  nextTick(() => deleteButtonRef.value?.focus())
}

const inputSizerRef = useTemplateRef('input-sizer')
const closeModal = useTemplateRef('closeModal')
const deleteButtonRef = useTemplateRef('deleteButton')
</script>
<template>
  <div
    ref="tab"
    @click="emit('select')"
    role="tab"
    class="tab shrink-0"
    :class="{ 'tab-active': active }"
  >
    <!--
      Input sizer to make input dynamically grow.
      See https://css-tricks.com/auto-growing-inputs-textareas/#aa-other-ideas
    -->
    <label ref="input-sizer" class="input-sizer min-w-14" :data-value="getInputSizerValue(value)">
      <input
        spellcheck="false"
        class="focus:outline-none"
        :value="value"
        :placeholder="PLACEHOLDER"
        @input="handleInput"
      />
    </label>
    <button
      class="btn btn-square btn-xs ml-2 btn-ghost"
      @click.stop="doRequestClose()"
      :title="t('common.actions.close')"
    >
      <XMarkIcon class="size-4"></XMarkIcon>
    </button>
  </div>
  <dialog class="modal" ref="closeModal">
    <div class="modal-box">
      <form method="dialog">
        <button
          class="btn btn-sm btn-square btn-ghost absolute right-2 top-2"
          :aria-label="t('common.actions.close')"
        >
          <XMarkIcon class="size-4"></XMarkIcon>
        </button>
      </form>
      <h3 class="text-lg font-bold">
        <i18n-t v-if="value" keypath="home.deleteDialog.deleteNamed" tag="span">
          <template #name
            ><span class="underline">{{ value }}</span></template
          >
        </i18n-t>
        <template v-else>{{ t('home.deleteDialog.deleteUnnamed') }}</template>
      </h3>
      <p class="py-4">
        <i18n-t keypath="home.deleteDialog.warning" tag="span">
          <template #highlight>
            <span class="font-bold">{{ t('home.deleteDialog.warningHighlight') }}</span>
          </template>
        </i18n-t>
        <br />
        {{ t('home.deleteDialog.warningHint') }}
      </p>
      <div class="modal-action">
        <button class="btn btn-sm" @click="emit('save')">
          <ArrowDownTrayIcon class="size-4"></ArrowDownTrayIcon>{{ t('common.actions.save') }}
        </button>
        <button ref="deleteButton" class="btn btn-error btn-sm" @click="emit('delete')">
          <TrashIcon class="size-4"></TrashIcon>{{ t('common.actions.delete') }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>{{ t('common.actions.dismiss') }}</button>
    </form>
  </dialog>
</template>

<style scoped>
input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.input-sizer {
  display: inline-block;
  position: relative;
  width: fit-content;
}

.input-sizer::after {
  content: attr(data-value) ' ';
  visibility: hidden;
}
</style>
