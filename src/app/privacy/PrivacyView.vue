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
import { ChevronLeftIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useLayoutMode } from '@/modules/common/layout/useLayoutMode'

const { t } = useI18n({ useScope: 'global' })
const { layoutMode } = useLayoutMode()
const router = useRouter()

const isCompact = computed(() => layoutMode.value === 'compact')

const sections = computed(() => [
  { id: 'what-we-collect', title: t('privacy.collect.title') },
  { id: 'what-we-dont', title: t('privacy.dont.title') },
  { id: 'opting-out', title: t('privacy.optOut.title') },
  { id: 'imprint', title: t('privacy.imprint.title') },
])
</script>

<template>
  <div class="flex flex-col bg-base-100" :class="isCompact ? 'h-dvh w-screen overflow-hidden' : ''">
    <!-- Mobile app bar -->
    <header
      v-if="isCompact"
      class="flex-none flex items-center gap-1 px-2 pr-3 border-b border-base-300 bg-base-200"
      style="padding-top: calc(env(safe-area-inset-top) + 0.5rem)"
    >
      <button
        class="btn btn-square btn-ghost btn-sm"
        :aria-label="t('privacy.backToEditor')"
        @click="router.push('/')"
      >
        <ChevronLeftIcon class="size-6 opacity-70" />
      </button>
      <span class="flex-1 text-lg font-bold py-2.5 leading-tight">{{
        t('privacy.pageTitle')
      }}</span>
    </header>

    <div
      :class="
        isCompact
          ? 'flex-1 overflow-y-auto px-4 py-4'
          : 'm-auto flex flex-nowrap justify-center my-4 gap-4'
      "
      :style="isCompact ? 'padding-bottom: max(env(safe-area-inset-bottom), 1.25rem)' : ''"
    >
      <!-- Desktop section nav -->
      <aside v-if="!isCompact" class="w-3xs">
        <ul class="menu">
          <h2 class="menu-title">{{ t('privacy.pageTitle') }}</h2>
          <li v-for="s of sections" :key="s.id">
            <a :href="'#' + s.id">{{ s.title }}</a>
          </li>
        </ul>
      </aside>

      <!-- Single source of truth for the notice text -->
      <main class="max-w-3xl">
        <h1 v-if="!isCompact" class="m-1 font-bold text-xl">{{ t('privacy.pageTitle') }}</h1>
        <i18n-t keypath="privacy.intro.text" tag="p" scope="global" class="m-1 mb-4">
          <template #emphasis
            ><strong>{{ t('privacy.intro.emphasis') }}</strong></template
          >
        </i18n-t>

        <h2 id="what-we-collect" class="m-1 font-bold text-lg">{{ t('privacy.collect.title') }}</h2>
        <p class="m-1">{{ t('privacy.collect.body') }}</p>

        <h2 id="what-we-dont" class="m-1 font-bold text-lg mt-4">{{ t('privacy.dont.title') }}</h2>
        <ul class="m-1 list-disc list-inside">
          <li>{{ t('privacy.dont.items.ip') }}</li>
          <li>{{ t('privacy.dont.items.location') }}</li>
          <li>{{ t('privacy.dont.items.shareIds') }}</li>
          <li>{{ t('privacy.dont.items.other') }}</li>
        </ul>

        <h2 id="opting-out" class="m-1 font-bold text-lg mt-4">{{ t('privacy.optOut.title') }}</h2>
        <i18n-t keypath="privacy.optOut.text" tag="p" scope="global" class="m-1 mb-4">
          <template #gpc
            ><a
              class="link link-primary"
              target="_blank"
              rel="noopener"
              href="https://globalprivacycontrol.org/"
              >{{ t('privacy.optOut.gpc') }}</a
            ></template
          >
          <template #dnt
            ><em>{{ t('privacy.optOut.dnt') }}</em></template
          >
        </i18n-t>

        <h2 id="imprint" class="m-1 font-bold text-lg mt-4">{{ t('privacy.imprint.title') }}</h2>
        <i18n-t keypath="privacy.imprint.responsible" tag="p" scope="global" class="m-1 mb-4">
          <template #email
            ><a class="link link-primary" href="mailto:lars.bengel@fernuni-hagen.de"
              >lars.bengel@fernuni-hagen.de</a
            ></template
          >
        </i18n-t>
      </main>
    </div>
  </div>
</template>
