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
<script setup lang="ts" generic="DocumentT">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import type { ModuleCard } from '@/app/home/moduleCard'
import { trackEvent } from '@/app/usage/report'
import { ANALYTICS_EVENTS } from '@/app/usage/signals'
import type { Example } from '@/modules/common/examples'
import HelpLinks from '@/modules/common/help/HelpLinks.vue'
import PublicationsTooltip from '@/modules/common/tooltip/PublicationsTooltip.vue'

const { moduleCards, sourceDocumentId } = defineProps<{
  moduleCards: ModuleCard<DocumentT>[]
  sourceDocumentId?: number
}>()

const emit = defineEmits<{
  open: [content: DocumentT, newNamePrefix: string]
}>()

const { t } = useI18n({ useScope: 'global' })

async function openExample(example: Example<DocumentT>, modulePrefix: string) {
  const content = example.load()
  await example.applyLayout?.(content)
  trackEvent(ANALYTICS_EVENTS.moduleOpen, example.name, {
    source: 'example',
    module: modulePrefix,
  })
  emit('open', content, example.name)
}

function openContent(content: DocumentT, modulePrefix: string) {
  trackEvent(ANALYTICS_EVENTS.moduleOpen, modulePrefix, { source: 'blank', module: modulePrefix })
  emit('open', content, modulePrefix)
}
</script>
<template>
  <div class="h-full w-full overflow-y-auto bg-base-200">
    <div class="min-h-full flex items-center justify-center">
      <div class="max-w-5xl w-full p-4 sm:p-8">
        <h2 class="text-2xl sm:text-4xl font-bold mb-2">
          AgonProject
          <div class="text-lg font-normal text-base-content/70">
            {{ t('home.tagline') }}
          </div>
        </h2>
        <HelpLinks />
        <div class="divider"></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            class="card bg-base-100 border border-base-300 shadow-md h-80"
            :class="{ 'opacity-50': moduleCard.underConstruction }"
            v-for="(moduleCard, index) in moduleCards"
            :key="index"
          >
            <div class="card-body flex flex-col h-full">
              <div class="flex items-start justify-between gap-2">
                <h3 class="card-title">{{ moduleCard.displayNameSingular }}</h3>
                <PublicationsTooltip
                  v-if="moduleCard.publications?.length"
                  :publications="moduleCard.publications"
                />
              </div>
              <div class="h-15 overflow-hidden">
                <p v-if="moduleCard.description" class="text-sm text-base-content/60 line-clamp-3">
                  {{ moduleCard.description }}
                </p>
              </div>
              <template v-if="moduleCard.underConstruction">
                <div class="flex-1"></div>
                <p class="text-sm text-base-content/50 italic">
                  {{ t('home.picker.underConstruction') }}
                </p>
              </template>
              <template v-else>
                <div
                  class="flex-1"
                  :class="moduleCard.examples.length > 4 ? 'overflow-y-auto min-h-0' : ''"
                >
                  <template v-if="moduleCard.examples.length !== 0">
                    <h4
                      class="text-xs font-semibold text-base-content/50 uppercase tracking-wide mt-2"
                    >
                      {{ t('home.picker.openExample') }}
                    </h4>
                    <ul
                      class="list-none p-0 m-0 grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]"
                    >
                      <li v-for="(example, index) in moduleCard.examples" :key="index">
                        <span
                          v-if="example.description"
                          class="tooltip tooltip-bottom"
                          :data-tip="example.description"
                        >
                          <a
                            class="block px-2 py-1 rounded-lg text-sm hover:bg-base-300 cursor-pointer"
                            @click="openExample(example, moduleCard.newNamePrefix)"
                            >{{ example.name }}</a
                          >
                        </span>
                        <a
                          v-else
                          class="block px-2 py-1 rounded-lg text-sm hover:bg-base-300 cursor-pointer"
                          @click="openExample(example, moduleCard.newNamePrefix)"
                          >{{ example.name }}</a
                        >
                      </li>
                    </ul>
                  </template>
                </div>
                <h4 class="text-xs font-semibold text-base-content/50 uppercase tracking-wide mt-2">
                  {{ t('home.picker.newHeading') }}
                </h4>
                <div class="flex flex-row gap-4 pl-2">
                  <button
                    class="btn btn-sm btn-soft w-fit"
                    @click="openContent(moduleCard.initialCotent, moduleCard.newNamePrefix)"
                  >
                    {{ t('home.picker.createNew') }}
                  </button>
                  <RouterLink
                    v-if="moduleCard.generateHref !== undefined"
                    :to="
                      sourceDocumentId !== undefined
                        ? moduleCard.generateHref + '&source=' + sourceDocumentId
                        : moduleCard.generateHref
                    "
                    class="btn btn-sm btn-soft w-fit"
                  >
                    {{ t('home.picker.generateModule', { module: moduleCard.newNamePrefix }) }}
                  </RouterLink>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
