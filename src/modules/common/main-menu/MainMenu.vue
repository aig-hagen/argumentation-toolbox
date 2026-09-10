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
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowsUpDownIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Bars3Icon,
  BookOpenIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  DocumentPlusIcon,
  FolderOpenIcon,
  PhotoIcon,
  QuestionMarkCircleIcon,
  ShareIcon,
  SparklesIcon,
  Squares2X2Icon,
} from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import {
  Layout,
  type LayoutData,
  layoutDatas,
  layoutLabelKey,
} from '@/modules/common/main-menu/layouting'
import { EntryState } from '@/modules/common/main-menu/types'
import { REDO_SHORTCUT, UNDO_SHORTCUT } from '@/modules/common/shortcuts'

const { t } = useI18n({ useScope: 'global' })

const {
  showSave = EntryState.HIDE,
  showUndo = EntryState.HIDE,
  showRedo = EntryState.HIDE,
  showExport = EntryState.HIDE,
  showShare = EntryState.HIDE,
  layoutsToShow = [],
} = defineProps<{
  showSave?: EntryState
  showUndo?: EntryState
  showRedo?: EntryState
  showExport?: EntryState
  showShare?: EntryState
  layoutsToShow?: Layout[]
}>()

const emit = defineEmits<{
  new: []
  load: []
  save: []
  undo: []
  layout: [layout: Layout]
  redo: []
  export: []
  share: []
  generate: []
  help: []
  settings: []
  tutorial: []
}>()

function onClickLayout(layout: Layout) {
  emit('layout', layout)
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement) {
    activeElement.blur()
  }
}

const directedLayouts = new Set<Layout>([
  Layout.TopToBottom,
  Layout.BottomToTop,
  Layout.LeftToRight,
  Layout.RightToLeft,
])

const directedLayoutDatasToShow = computed<Record<Layout, LayoutData>>(() => {
  const result: Record<Layout, LayoutData> = Object.create(null)
  for (const layout of layoutsToShow) {
    if (directedLayouts.has(layout)) result[layout] = layoutDatas[layout]
  }
  return result
})

const otherLayoutDatasToShow = computed<Record<Layout, LayoutData>>(() => {
  const result: Record<Layout, LayoutData> = Object.create(null)
  for (const layout of layoutsToShow) {
    if (!directedLayouts.has(layout)) result[layout] = layoutDatas[layout]
  }
  return result
})

const hasDirectedLayouts = computed(() => Object.keys(directedLayoutDatasToShow.value).length > 0)
</script>
<template>
  <div class="dropdown pointer-events-auto">
    <div tabindex="0" role="button" class="btn btn-square btn-sm" :title="t('menu.label')">
      <Bars3Icon class="size-6 opacity-70" />
    </div>
    <ul tabindex="-1" class="dropdown-content w-max menu bg-base-100 rounded-box z-1 shadow-md/30">
      <li>
        <a @click="emit('new')"
          ><DocumentPlusIcon class="size-5 menu-icon" />{{ t('menu.newFramework') }}</a
        >
      </li>
      <li>
        <a @click="emit('load')"
          ><FolderOpenIcon class="size-5 menu-icon" />{{ t('menu.openFile') }}</a
        >
      </li>
      <li v-if="showSave !== EntryState.HIDE">
        <a
          :class="{
            'opacity-50 pointer-events-none': showSave === EntryState.DISABLE,
          }"
          @click="emit('save')"
          ><ArrowDownTrayIcon class="size-5 menu-icon" />{{ t('menu.saveToDevice') }}</a
        >
      </li>
      <li>
        <a @click="emit('generate')"
          ><Squares2X2Icon class="size-5 menu-icon" />{{ t('menu.generateRandom') }}</a
        >
      </li>
      <template v-if="showUndo !== EntryState.HIDE || showRedo !== EntryState.HIDE">
        <li class="disabled"><hr class="mt-2 border-base-300" /></li>
        <li v-if="showUndo !== EntryState.HIDE">
          <a
            :class="{
              'opacity-50 pointer-events-none': showUndo === EntryState.DISABLE,
            }"
            @click="emit('undo')"
            class="flex justify-between gap-8"
          >
            <span class="flex items-center gap-2">
              <ArrowUturnLeftIcon class="size-5 menu-icon" />{{ t('menu.undo') }}
            </span>
            <span class="flex gap-1 items-center">
              <kbd class="text-xs opacity-40 font-mono" v-if="UNDO_SHORTCUT.modifiers.ctrl"
                >Ctrl</kbd
              >
              <kbd class="text-xs opacity-40 font-mono" v-if="UNDO_SHORTCUT.modifiers.meta">⌘</kbd>
              <kbd class="text-xs opacity-40 font-mono" v-if="UNDO_SHORTCUT.modifiers.shift"
                >Shift</kbd
              >

              <kbd class="text-xs opacity-40 font-mono">{{ UNDO_SHORTCUT.key.toUpperCase() }}</kbd>
            </span>
          </a>
        </li>
        <li v-if="showRedo !== EntryState.HIDE">
          <a
            :class="{
              'opacity-50 pointer-events-none': showRedo === EntryState.DISABLE,
            }"
            @click="emit('redo')"
            class="flex justify-between gap-8"
          >
            <span class="flex items-center gap-2">
              <ArrowUturnRightIcon class="size-5 menu-icon" />{{ t('menu.redo') }}
            </span>
            <span class="flex gap-1 items-center">
              <kbd class="text-xs opacity-40 font-mono" v-if="REDO_SHORTCUT.modifiers.ctrl"
                >Ctrl</kbd
              >
              <kbd class="text-xs opacity-40 font-mono" v-if="REDO_SHORTCUT.modifiers.meta">⌘</kbd>
              <kbd class="text-xs opacity-40 font-mono" v-if="REDO_SHORTCUT.modifiers.shift"
                >Shift</kbd
              >
              <kbd class="text-xs opacity-40 font-mono">{{ REDO_SHORTCUT.key.toUpperCase() }}</kbd>
            </span>
          </a>
        </li>
      </template>
      <template v-if="layoutsToShow.length > 0">
        <li class="disabled"><hr class="mt-2 border-base-300" /></li>
        <li>
          <div class="dropdown dropdown-hover dropdown-right">
            <a class="flex flex-row justify-between">
              <div>
                <SparklesIcon class="inline size-5 menu-icon mr-2" />
                <span>{{ t('menu.relayout') }}</span>
              </div>
              <ChevronRightIcon class="size-5 opacity-40" />
            </a>
            <div tabindex="-1" class="dropdown-content p-0">
              <ul class="menu bg-base-100 rounded-box z-1 mt-0 ml-0 w-max shadow-sm/30">
                <li v-if="hasDirectedLayouts">
                  <div class="dropdown dropdown-hover dropdown-right">
                    <a class="flex flex-row justify-between">
                      <div>
                        <ArrowsUpDownIcon class="inline size-5 menu-icon mr-2" />
                        <span>{{ t('menu.directed') }}</span>
                      </div>
                      <ChevronRightIcon class="size-5 opacity-40" />
                    </a>
                    <div tabindex="-1" class="dropdown-content p-0">
                      <ul class="menu bg-base-100 rounded-box z-1 mt-0 ml-0 w-max shadow-sm/30">
                        <li
                          v-for="(layoutData, layoutType) in directedLayoutDatasToShow"
                          :key="layoutType"
                        >
                          <a @click="onClickLayout(layoutType)"
                            ><component :is="layoutData.icon" class="size-5 menu-icon" />{{
                              t(layoutLabelKey(layoutType))
                            }}</a
                          >
                        </li>
                      </ul>
                    </div>
                  </div>
                </li>
                <li v-for="(layoutData, layoutType) in otherLayoutDatasToShow" :key="layoutType">
                  <a @click="onClickLayout(layoutType)"
                    ><component :is="layoutData.icon" class="size-5 menu-icon" />{{
                      t(layoutLabelKey(layoutType))
                    }}</a
                  >
                </li>
              </ul>
            </div>
          </div>
        </li>
      </template>
      <template v-if="showExport !== EntryState.HIDE">
        <li class="disabled"><hr class="mt-2 border-base-300" /></li>
        <li>
          <a
            :class="{
              'opacity-50 pointer-events-none': showExport === EntryState.DISABLE,
            }"
            @click="emit('export')"
            ><PhotoIcon class="size-5 menu-icon" />{{ t('menu.export') }}</a
          >
        </li>
        <li v-if="showShare !== EntryState.HIDE">
          <a
            :class="{
              'opacity-50 pointer-events-none': showShare === EntryState.DISABLE,
            }"
            @click="emit('share')"
            ><ShareIcon class="size-5 menu-icon" />{{ t('menu.shareLink') }}</a
          >
        </li>
      </template>
      <li class="disabled"><hr class="mt-2 border-base-300" /></li>
      <li>
        <a @click="emit('settings')"
          ><Cog6ToothIcon class="size-5 menu-icon" />{{ t('menu.settings') }}</a
        >
      </li>
      <li>
        <a @click="emit('tutorial')"
          ><AcademicCapIcon class="size-5 menu-icon" />{{ t('menu.tutorials') }}</a
        >
      </li>
      <li>
        <RouterLink to="/glossary"
          ><BookOpenIcon class="size-5 menu-icon" />{{ t('menu.glossary') }}</RouterLink
        >
      </li>
      <li>
        <a @click="emit('help')"
          ><QuestionMarkCircleIcon class="size-5 menu-icon" />{{ t('menu.help') }}</a
        >
      </li>
    </ul>
  </div>
</template>
