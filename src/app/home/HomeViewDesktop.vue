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
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import type { IDBPDatabase } from 'idb'
import type { Objectish } from 'immer'
import { computed, provide, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import BlankDocumentCanvas from '@/app/home/BlankDocumentCanvas.vue'
import LayoutTabs from '@/app/home/EditorTabs.vue'
import type { ModuleConfig } from '@/app/home/moduleConfig'
import type { HomeController } from '@/app/home/useHomeController'
import { useModuleCards } from '@/app/home/useModuleCards'
import { ACTIVE_MODULE_KEY } from '@/app/usage/moduleContext'
import type { DocumentsDB } from '@/modules/common/documents/db'
import NotificationsDisplay from '@/modules/common/notifications/NotificationsDisplay.vue'
import WindowSettings from '@/modules/common/settings/WindowSettings.vue'
import ShareModal from '@/modules/common/share/ShareModal.vue'

const { db, modules, controller } = defineProps<{
  db: IDBPDatabase<DocumentsDB>
  modules: ModuleConfig<DocumentT>[]
  controller: HomeController<DocumentT>
}>()

const moduleCards = useModuleCards(modules)

const {
  notifications,
  documents,
  deleteDocument,
  renameDocument,
  selectedDocumentId,
  selectDocument,
  documentModule,
  documentLoading,
  documentState,
  loadedDocuments,
  updateDocument,
  overrideWithContent,
  createAndSelectBlankDocument,
  createDocumentWithContent,
  undo,
  redo,
  showCreate,
  historyState,
  handleEditorShortcut,
  loadFromFileInput,
  shareUrl,
  shareDocument,
  isSharing,
  shareCopied,
  quickShareDocument,
  saveAsFile,
  exportAsFile,
} = controller

// Active module tag for evaluation analytics attribution.
provide(
  ACTIVE_MODULE_KEY,
  computed(() => documentModule.value?.newNamePrefix),
)

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })

const settingsDialog = useTemplateRef<InstanceType<typeof WindowSettings>>('settingsDialog')

const fileInput = useTemplateRef<HTMLInputElement>('file-input')

function loadFile() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="screen flex flex-col h-screen w-screen m-0 bg-base-100">
    <LayoutTabs
      class="flex-none"
      :data="documents.map((document) => ({ id: document.id, name: document.name }))"
      :selected="selectedDocumentId"
      @select="selectDocument($event)"
      @create="createAndSelectBlankDocument"
      @delete="deleteDocument($event)"
      @clear-all="documents.forEach((d) => deleteDocument(d.id))"
      @rename="(id, name) => renameDocument(id, name)"
      :db="db"
      :modules="modules"
      @save="saveAsFile($event)"
      :show-create="showCreate"
      :sharing="isSharing"
      :share-copied="shareCopied"
      @quick-share="quickShareDocument"
    />
    <main class="border-t -mt-px border-base-300 editor flex-1 overflow-hidden">
      <div class="relative h-full w-full">
        <BlankDocumentCanvas
          v-if="selectedDocumentId === undefined"
          :module-cards="moduleCards"
          @open="createDocumentWithContent"
        ></BlankDocumentCanvas>
        <BlankDocumentCanvas
          v-if="!documentLoading && documentState === undefined"
          :module-cards="moduleCards"
          :source-document-id="selectedDocumentId"
          @open="overrideWithContent"
        ></BlankDocumentCanvas>
        <component
          tabindex="0"
          v-for="loadedDocument of loadedDocuments"
          v-show="loadedDocument.id === selectedDocumentId"
          :key="loadedDocument.id"
          :is="loadedDocument.module.editorComponent"
          @change="
            (state) => {
              if (loadedDocument.id === selectedDocumentId) updateDocument(state)
            }
          "
          @new="createAndSelectBlankDocument"
          @load="loadFile"
          @generate="router.push(documentModule?.generateHref ?? '/generate')"
          :state="loadedDocument.state"
          :document-id="loadedDocument.id"
          :history-state="historyState"
          @keydown="handleEditorShortcut"
          @undo="undo"
          @redo="redo"
          @save="saveAsFile(loadedDocument.id)"
          @share="shareDocument(loadedDocument.id)"
          @export="exportAsFile(loadedDocument.id, $event)"
        />
      </div>
    </main>
    <!-- Settings: home view only (hidden once an editor is open). -->
    <button
      v-if="selectedDocumentId === undefined"
      class="btn btn-square btn-ghost absolute bottom-4 right-4 bg-base-100 shadow-sm border border-base-300"
      :title="t('settings.title')"
      :aria-label="t('settings.title')"
      @click="settingsDialog?.open()"
    >
      <Cog6ToothIcon class="size-5 opacity-70" />
    </button>
  </div>
  <WindowSettings ref="settingsDialog" />
  <NotificationsDisplay :notifications="notifications" />
  <ShareModal :url="shareUrl" @close="shareUrl = null" />
  <input
    ref="file-input"
    type="file"
    v-show="false"
    accept="application/json"
    @change="loadFromFileInput($event)"
  />
</template>
