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
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import type { Objectish } from 'immer'
import { computed, provide, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import BlankDocumentCanvasMobile from '@/app/home/BlankDocumentCanvasMobile.vue'
import type { ModuleConfig } from '@/app/home/moduleConfig'
import type { HomeController } from '@/app/home/useHomeController'
import { useHomeSurface } from '@/app/home/useHomeSurface'
import { useModuleCards } from '@/app/home/useModuleCards'
import { ACTIVE_MODULE_KEY } from '@/app/usage/moduleContext'
import NotificationsDisplay from '@/modules/common/notifications/NotificationsDisplay.vue'
import { QUICK_SHARE_KEY } from '@/modules/common/share/quickShareKey'
import { relativeTime } from '@/modules/common/util'
import BottomSheet from '@/modules/common/window/BottomSheet.vue'

const { modules, controller } = defineProps<{
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
  documentState,
  documentLoading,
  updateDocument,
  overrideWithContent,
  createDocumentWithContent,
  undo,
  redo,
  historyState,
  handleEditorShortcut,
  loadFromFileInput,
  loadedDocuments,
  quickShareDocument,
  saveAsFile,
  exportAsFile,
} = controller

const { t, locale } = useI18n({ useScope: 'global' })

function formatEdited(timestamp: number): string {
  const rel = relativeTime(timestamp)
  const time =
    rel.unit === 'absolute'
      ? new Date(rel.timestamp).toLocaleDateString(locale.value)
      : t(`common.time.${rel.unit}`, rel.unit === 'justNow' ? {} : { count: rel.count })
  return t('home.documents.edited', { time })
}

// Let deep editor surfaces (e.g. the export sheet) trigger a quick share.
provide(QUICK_SHARE_KEY, quickShareDocument)
// Active module tag for evaluation analytics attribution.
provide(
  ACTIVE_MODULE_KEY,
  computed(() => documentModule.value?.newNamePrefix),
)

const router = useRouter()

const { surface, goTo } = useHomeSurface(() =>
  selectedDocumentId.value !== undefined
    ? 'editor'
    : documents.value.length > 0
      ? 'documents'
      : 'new',
)

// Only mount the editor once its surface is actually shown, then keep it mounted so
// state survives later surface switches. Mounting it while the editor surface is hidden
// (display:none) would run the graph library's layout math on a 0×0 box → NaN transforms.
const editorMounted = ref(false)
watch(
  surface,
  (value) => {
    if (value === 'editor') editorMounted.value = true
  },
  { immediate: true },
)

const selectedName = computed(
  () => documents.value.find((d) => d.id === selectedDocumentId.value)?.name ?? '',
)

function openDocument(id: number) {
  selectDocument(id)
  goTo('editor')
}

// Per-row rename / delete-confirm state for the Documents surface.
const renamingId = ref<number | null>(null)
const renameText = ref('')
const confirmDeleteAll = ref(false)

// Per-row overflow menu (rename / save / delete) rendered as a bottom sheet.
const menuDocId = ref<number | null>(null)
const menuDoc = computed(() => documents.value.find((d) => d.id === menuDocId.value) ?? null)
const menuOpen = computed({
  get: () => menuDocId.value !== null,
  set: (value: boolean) => {
    if (!value) menuDocId.value = null
  },
})

function startRename(document: { id: number; name: string }) {
  renamingId.value = document.id
  renameText.value = document.name
}

function commitRename() {
  if (renamingId.value === null) return
  const name = renameText.value.trim()
  if (name.length > 0) renameDocument(renamingId.value, name)
  renamingId.value = null
}

// Overflow-sheet actions: close the sheet, then run the row action.
function menuRename(document: { id: number; name: string }) {
  menuDocId.value = null
  startRename(document)
}
function menuSave(id: number) {
  menuDocId.value = null
  saveAsFile(id)
}
function menuDelete(id: number) {
  menuDocId.value = null
  deleteDocument(id)
}

function deleteAll() {
  documents.value.forEach((document) => deleteDocument(document.id))
  confirmDeleteAll.value = false
}

async function createFromNew(content: DocumentT, newNamePrefix: string) {
  await createDocumentWithContent(content, newNamePrefix)
  goTo('editor')
}

const fileInput = useTemplateRef<HTMLInputElement>('file-input')

function loadFile() {
  fileInput.value?.click()
}
</script>

<template>
  <!-- Dynamic viewport height so the bottom command bar tracks iOS/Android browser chrome
       showing/hiding, instead of sitting behind it as 100vh would. -->
  <div class="flex flex-col h-dvh w-screen m-0 bg-base-100 overflow-hidden">
    <!-- Persistent brand hero (Documents/New surfaces); the editor surface uses
         GraphEditor's own top bar. Name + tagline stay visible while switching tabs. -->
    <header
      v-if="surface !== 'editor'"
      class="flex-none relative flex flex-col items-center text-center px-6 pb-3"
      style="padding-top: calc(env(safe-area-inset-top) + 1rem)"
    >
      <button
        v-if="selectedDocumentId !== undefined && documentState !== undefined"
        class="btn btn-square btn-ghost btn-sm absolute right-2"
        style="top: calc(env(safe-area-inset-top) + 0.5rem)"
        :aria-label="t('home.backToEditor')"
        @click="goTo('editor')"
      >
        <XMarkIcon class="size-5 opacity-70" />
      </button>
      <span class="grid place-items-center size-13 rounded-2xl bg-base-200 text-primary mb-2.5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          class="size-7"
        >
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="17" r="3" />
          <path d="M9.5 9.5 14.5 14.5" />
        </svg>
      </span>
      <h1 class="text-2xl font-bold tracking-tight">AgonProject</h1>
      <p class="text-sm text-base-content/60 mt-1 max-w-64 leading-snug">
        {{ t('home.tagline') }}
      </p>
    </header>

    <!-- Documents | New segmented control (both non-editor surfaces). -->
    <div v-if="surface !== 'editor'" class="flex-none px-4 pt-1 pb-1">
      <div class="grid grid-cols-2 p-1 rounded-xl bg-base-200">
        <button
          class="h-9 rounded-lg text-sm font-semibold transition-colors"
          :class="surface === 'documents' ? 'bg-base-100 shadow-sm' : 'opacity-60'"
          @click="goTo('documents')"
        >
          {{ t('home.surfaces.frameworks') }}
        </button>
        <button
          class="h-9 rounded-lg text-sm font-semibold transition-colors"
          :class="surface === 'new' ? 'bg-base-100 shadow-sm' : 'opacity-60'"
          @click="goTo('new')"
        >
          {{ t('home.surfaces.new') }}
        </button>
      </div>
    </div>

    <main class="flex-1 relative overflow-hidden">
      <!-- Documents surface -->
      <div v-show="surface === 'documents'" class="absolute inset-0 overflow-y-auto px-3 pb-3 pt-1">
        <div
          v-if="confirmDeleteAll"
          class="flex items-center gap-2 rounded-xl border border-error px-3 py-2 my-2"
        >
          <span class="flex-1 text-sm">{{ t('home.documents.confirmDeleteAll') }}</span>
          <button class="btn btn-ghost btn-sm" @click="confirmDeleteAll = false">
            {{ t('common.actions.cancel') }}
          </button>
          <button class="btn btn-error btn-sm" @click="deleteAll">
            {{ t('home.documents.deleteAll') }}
          </button>
        </div>

        <p v-if="documents.length === 0" class="text-center opacity-60 py-10">
          {{ t('home.documents.empty') }}
        </p>

        <ul class="flex flex-col">
          <li v-for="document of documents" :key="document.id">
            <!-- Rename mode -->
            <div
              v-if="renamingId === document.id"
              class="flex items-center gap-2 rounded-xl border border-primary px-3 py-2 my-1"
            >
              <input
                v-model="renameText"
                class="input input-sm flex-1"
                @keydown.enter="commitRename"
                @keydown.esc="renamingId = null"
              />
              <button class="btn btn-ghost btn-sm" @click="renamingId = null">
                {{ t('common.actions.cancel') }}
              </button>
              <button class="btn btn-primary btn-sm" @click="commitRename">
                {{ t('common.actions.save') }}
              </button>
            </div>

            <!-- Default row -->
            <div
              v-else
              class="flex items-center gap-3 rounded-xl px-2.5 py-2.5"
              :class="
                document.id === selectedDocumentId
                  ? 'bg-primary/10 border border-primary/30'
                  : 'border border-transparent'
              "
            >
              <button
                class="flex flex-1 items-center gap-3 min-w-0 text-left"
                @click="openDocument(document.id)"
              >
                <span
                  class="grid place-items-center size-11 shrink-0 rounded-xl text-xs font-bold"
                  :class="
                    document.id === selectedDocumentId
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 text-primary'
                  "
                >
                  <template v-if="document.type">{{ document.type }}</template>
                  <DocumentTextIcon v-else class="size-6" />
                </span>
                <span class="flex flex-col min-w-0 leading-tight">
                  <span class="truncate text-[0.95rem] font-semibold">{{
                    document.name || t('home.untitled')
                  }}</span>
                  <span
                    v-if="document.id === selectedDocumentId"
                    class="text-xs text-base-content/60"
                    >{{ t('home.documents.openNow') }}</span
                  >
                  <span
                    v-else-if="document.lastEdited !== undefined"
                    class="text-xs text-base-content/60"
                    >{{ formatEdited(document.lastEdited) }}</span
                  >
                </span>
              </button>
              <span
                v-if="document.id === selectedDocumentId"
                class="size-2 shrink-0 rounded-full bg-success"
              />
              <button
                class="btn btn-square btn-ghost size-11"
                :aria-label="
                  t('home.documents.actionsFor', { name: document.name || t('home.untitled') })
                "
                @click="menuDocId = document.id"
              >
                <EllipsisHorizontalIcon class="size-5 opacity-60" />
              </button>
            </div>
          </li>
        </ul>

        <button
          v-if="documents.length > 0"
          class="btn btn-ghost btn-sm text-error/80 mt-4 mx-auto flex"
          @click="confirmDeleteAll = true"
        >
          {{ t('home.documents.deleteAllFrameworks') }}
        </button>
      </div>

      <!-- New surface -->
      <!-- scrollbar-gutter keeps the width stable so cards don't reflow when one expands. -->
      <div
        v-show="surface === 'new'"
        class="absolute inset-0 overflow-y-auto"
        style="scrollbar-gutter: stable"
      >
        <BlankDocumentCanvasMobile :module-cards="moduleCards" @open="createFromNew" />
      </div>

      <!-- Editor surface: mounted on first visit, then kept mounted across surface switches -->
      <div v-show="surface === 'editor'" class="absolute inset-0">
        <template v-if="editorMounted">
          <!-- Blank doc with no content yet: pick a module to fill it in place (mirrors desktop). -->
          <div
            v-if="
              selectedDocumentId !== undefined && !documentLoading && documentState === undefined
            "
            class="absolute inset-0 overflow-y-auto"
            style="scrollbar-gutter: stable"
          >
            <BlankDocumentCanvasMobile
              :module-cards="moduleCards"
              :source-document-id="selectedDocumentId"
              @open="overrideWithContent"
            />
          </div>
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
            @new="goTo('new')"
            @load="loadFile"
            @generate="router.push(documentModule?.generateHref ?? '/generate')"
            @home="goTo('documents')"
            :state="loadedDocument.state"
            :document-id="loadedDocument.id"
            :document-name="selectedName"
            :type-badge="loadedDocument.module.newNamePrefix"
            :history-state="historyState"
            @keydown="handleEditorShortcut"
            @undo="undo"
            @redo="redo"
            @save="saveAsFile(loadedDocument.id)"
            @export="exportAsFile(loadedDocument.id, $event)"
          />
        </template>
      </div>
    </main>

    <!-- Sticky primary action on the Documents surface. -->
    <footer
      v-if="surface === 'documents'"
      class="flex-none px-4 pt-2.5 border-t border-base-200"
      style="padding-bottom: max(env(safe-area-inset-bottom), 0.75rem)"
    >
      <button class="btn btn-primary w-full h-13 rounded-2xl gap-2 text-base" @click="goTo('new')">
        <PlusIcon class="size-5" /> {{ t('menu.newFramework') }}
      </button>
    </footer>
  </div>

  <!-- Per-document overflow actions. -->
  <BottomSheet v-model:open="menuOpen" :title="menuDoc?.name || t('home.untitled')">
    <div v-if="menuDoc" class="flex flex-col gap-1 pb-4">
      <button
        class="btn btn-ghost justify-start gap-3"
        @click="menuRename({ id: menuDoc.id, name: menuDoc.name })"
      >
        <PencilSquareIcon class="size-5 menu-icon" /> {{ t('common.actions.rename') }}
      </button>
      <button class="btn btn-ghost justify-start gap-3" @click="menuSave(menuDoc.id)">
        <ArrowDownTrayIcon class="size-5 menu-icon" /> {{ t('menu.saveToDevice') }}
      </button>
      <button class="btn btn-ghost justify-start gap-3 text-error" @click="menuDelete(menuDoc.id)">
        <TrashIcon class="size-5" /> {{ t('common.actions.delete') }}
      </button>
    </div>
  </BottomSheet>

  <NotificationsDisplay :notifications="notifications" placement="center" />
  <input
    ref="file-input"
    type="file"
    v-show="false"
    accept="application/json"
    @change="loadFromFileInput($event)"
  />
</template>
