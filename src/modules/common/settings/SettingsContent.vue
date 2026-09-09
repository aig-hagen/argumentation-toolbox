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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { SupportedLocale } from '@/localization'
import { LOCALE_AUTONYMS, useLocale } from '@/localization'
import type { GridVisibility, PhysicsMode } from '@/modules/common/main-menu/types'
import SegmentedControl from '@/modules/common/settings/SegmentedControl.vue'
import type { GridType } from '@/modules/common/settings/useSettings'
import { useSettings } from '@/modules/common/settings/useSettings'
import type { ThemePreference } from '@/modules/common/theme/useTheme'
import { useTheme } from '@/modules/common/theme/useTheme'
import { useTutorial } from '@/modules/common/tutorial/useTutorial'

const { t } = useI18n({ useScope: 'global' })
const { locale, setLocale, supportedLocales } = useLocale()
const { themePreference } = useTheme()
const {
  graphStyle,
  defaultPhysicsMode,
  defaultShowGrid,
  defaultGridType,
  gridCellScale,
  snapMode,
  showHints,
} = useSettings()
const { resetAllTutorials } = useTutorial()

function onLocaleChange(event: Event): void {
  void setLocale((event.target as HTMLSelectElement).value as SupportedLocale)
}

const physicsOptions = computed<{ value: PhysicsMode; label: string }[]>(() => [
  { value: 'off', label: t('common.states.off') },
  { value: 'on', label: t('common.states.on') },
])
const booleanOptions = computed<{ value: boolean; label: string }[]>(() => [
  { value: false, label: t('common.states.off') },
  { value: true, label: t('common.states.on') },
])
const gridOptions = computed<{ value: GridVisibility; label: string }[]>(() => [
  { value: 'off', label: t('common.states.off') },
  { value: 'auto', label: t('settings.showGrid.onDrag') },
  { value: 'on', label: t('common.states.on') },
])
const gridTypeOptions = computed<{ value: GridType; label: string }[]>(() => [
  { value: 'square', label: t('settings.gridType.square') },
  { value: 'rhombus', label: t('settings.gridType.rhombus') },
])
const themeOptions = computed<{ value: ThemePreference; label: string }[]>(() => [
  { value: 'light', label: t('settings.theme.light') },
  { value: 'system', label: t('settings.theme.system') },
  { value: 'dark', label: t('settings.theme.dark') },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Language -->
    <section class="flex flex-col gap-2">
      <h4 class="px-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {{ t('settings.sections.language') }}
      </h4>
      <div class="divide-y divide-base-200 overflow-hidden rounded-2xl border border-base-300">
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.language.label') }}</span>
          <select
            class="select select-sm w-36"
            :value="locale"
            :aria-label="t('settings.language.label')"
            @change="onLocaleChange"
          >
            <option v-for="code in supportedLocales" :key="code" :value="code">
              {{ LOCALE_AUTONYMS[code] }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <!-- Appearance -->
    <section class="flex flex-col gap-2">
      <h4 class="px-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {{ t('settings.sections.appearance') }}
      </h4>
      <div class="divide-y divide-base-200 overflow-hidden rounded-2xl border border-base-300">
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.theme.label') }}</span>
          <SegmentedControl
            v-model="themePreference"
            :options="themeOptions"
            :aria-label="t('settings.theme.label')"
          />
        </div>
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.graphStyle.label') }}</span>
          <select class="select select-sm w-36" v-model="graphStyle">
            <option value="default">{{ t('settings.graphStyle.default') }}</option>
            <option value="high-contrast">{{ t('settings.graphStyle.highContrast') }}</option>
            <option value="minimal">{{ t('settings.graphStyle.minimal') }}</option>
            <option value="library">{{ t('settings.graphStyle.library') }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Graph defaults -->
    <section class="flex flex-col gap-2">
      <h4 class="px-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {{ t('settings.sections.graphDefaults') }}
      </h4>
      <div class="divide-y divide-base-200 overflow-hidden rounded-2xl border border-base-300">
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.physicsMode.label') }}</span>
          <SegmentedControl
            v-model="defaultPhysicsMode"
            :options="physicsOptions"
            :aria-label="t('settings.physicsMode.label')"
          />
        </div>
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.showGrid.label') }}</span>
          <SegmentedControl
            v-model="defaultShowGrid"
            :options="gridOptions"
            :aria-label="t('settings.showGrid.label')"
          />
        </div>
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.gridType.label') }}</span>
          <SegmentedControl
            v-model="defaultGridType"
            :options="gridTypeOptions"
            :aria-label="t('settings.gridType.label')"
          />
        </div>
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.gridCellSize.label') }}</span>
          <div class="flex items-center gap-2">
            <input
              type="range"
              class="range range-sm range-primary w-28"
              min="2"
              max="6"
              step="0.5"
              v-model.number="gridCellScale"
            />
            <span class="w-6 text-right text-sm text-base-content/60">{{ gridCellScale }}×</span>
          </div>
        </div>
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.snapToGrid.label') }}</span>
          <SegmentedControl
            v-model="snapMode"
            :options="booleanOptions"
            :aria-label="t('settings.snapToGrid.label')"
          />
        </div>
      </div>
    </section>

    <!-- Tutorials -->
    <section class="flex flex-col gap-2">
      <h4 class="px-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">
        {{ t('settings.sections.tutorials') }}
      </h4>
      <div class="divide-y divide-base-200 overflow-hidden rounded-2xl border border-base-300">
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.showTutorials.label') }}</span>
          <SegmentedControl
            v-model="showHints"
            :options="booleanOptions"
            :aria-label="t('settings.showTutorials.label')"
          />
        </div>
        <div class="flex items-center justify-between gap-4 bg-base-100 px-3.5 py-3">
          <span class="text-sm">{{ t('settings.tutorialProgress.label') }}</span>
          <button class="btn btn-ghost btn-xs" @click="resetAllTutorials">
            {{ t('common.actions.reset') }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
