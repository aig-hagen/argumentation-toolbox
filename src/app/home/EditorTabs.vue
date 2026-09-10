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
import { CheckIcon, LinkIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { IDBPDatabase } from 'idb'
import type { Objectish } from 'immer'
import { nextTick, useAttrs, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import EditorTab from '@/app/home/EditorTab.vue'
import type { ModuleConfig } from '@/app/home/moduleConfig'
import type { DocumentsDB } from '@/modules/common/documents/db'

defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const { t } = useI18n({ useScope: 'global' })

defineProps<{
  data: readonly { readonly name: string; readonly id: number }[]
  selected?: number
  db: IDBPDatabase<DocumentsDB>
  modules: ModuleConfig<DocumentT>[]
  showCreate?: boolean
  sharing?: boolean
  shareCopied?: boolean
  onBlankCanvas?: boolean
}>()

const emit = defineEmits<{
  rename: [id: number, name: string]
  select: [id: number]
  delete: [id: number]
  create: []
  save: [id: number]
  clearAll: []
  quickShare: []
}>()

const clearAllModal = useTemplateRef('clearAllModal')
const clearAllButtonRef = useTemplateRef('clearAllButton')

function openClearAllModal() {
  clearAllModal.value?.showModal()
  nextTick(() => clearAllButtonRef.value?.focus())
}
</script>

<template>
  <div class="flex bg-base-200" v-bind="attrs">
    <div role="tablist" class="tabs tabs-lift flex-nowrap overflow-x-auto flex-1 min-w-0">
      <EditorTab
        ref="editorTab"
        v-for="datum in data"
        :key="datum.id"
        :value="datum.name"
        :active="datum.id === selected"
        @delete="emit('delete', datum.id)"
        @rename="emit('rename', datum.id, $event)"
        @select="emit('select', datum.id)"
        :document-id="datum.id"
        :db="db"
        :modules="modules"
        @save="emit('save', datum.id)"
      />
      <div v-if="showCreate" role="tab" class="tab">
        <button
          class="btn btn-square btn-xs btn-ghost"
          @click="emit('create')"
          :title="t('home.tabs.create')"
        >
          <PlusIcon class="size-4" />
        </button>
      </div>
    </div>
    <div
      v-if="data.length > 0"
      class="flex items-center px-1 gap-0.5 shrink-0 border-b border-base-300"
    >
      <button
        v-if="!onBlankCanvas"
        class="btn btn-square btn-xs btn-ghost"
        :disabled="sharing"
        @click="emit('quickShare')"
        :title="t('home.tabs.copyShareLink')"
      >
        <span v-if="sharing" class="loading loading-spinner loading-xs" />
        <CheckIcon v-else-if="shareCopied" class="size-4 text-success" />
        <LinkIcon v-else class="size-4" />
      </button>
      <button
        class="btn btn-square btn-xs btn-ghost text-error"
        @click="openClearAllModal"
        :title="t('home.documents.deleteAll')"
      >
        <TrashIcon class="size-4" />
      </button>
    </div>
  </div>
  <dialog class="modal" ref="clearAllModal">
    <div class="modal-box">
      <form method="dialog">
        <button
          class="btn btn-sm btn-square btn-ghost absolute right-2 top-2"
          :aria-label="t('common.actions.close')"
        >
          <XMarkIcon class="size-4" />
        </button>
      </form>
      <h3 class="text-lg font-bold">{{ t('home.documents.deleteAllFrameworks') }}</h3>
      <p class="py-4">
        <i18n-t keypath="home.deleteDialog.warning" tag="span" scope="global">
          <template #highlight>
            <span class="font-bold">{{ t('home.deleteDialog.warningHighlight') }}</span>
          </template>
        </i18n-t>
        <br />
        {{ t('home.deleteDialog.warningHint') }}
      </p>
      <div class="modal-action">
        <button
          ref="clearAllButton"
          class="btn btn-error btn-sm"
          @click="
            () => {
              clearAllModal?.close()
              emit('clearAll')
            }
          "
        >
          <TrashIcon class="size-4" />{{ t('home.documents.deleteAll') }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>{{ t('common.actions.dismiss') }}</button>
    </form>
  </dialog>
</template>
