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
import { ChevronDownIcon, PlusIcon, Squares2X2Icon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import type { ModuleCard } from '@/app/home/moduleCard'
import { trackEvent } from '@/app/usage/report'
import { ANALYTICS_EVENTS } from '@/app/usage/signals'
import type { Example } from '@/modules/common/examples'

const { moduleCards, sourceDocumentId } = defineProps<{
  moduleCards: ModuleCard<DocumentT>[]
  sourceDocumentId?: number
}>()

const emit = defineEmits<{
  open: [content: DocumentT, newNamePrefix: string]
}>()

const { t } = useI18n({ useScope: 'global' })

// Accordion: one card open at a time; the first editable module starts expanded.
const expanded = ref(moduleCards.findIndex((card) => !card.underConstruction))

function toggle(index: number) {
  expanded.value = expanded.value === index ? -1 : index
}

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
  <div class="flex flex-col gap-2.5 p-4">
    <div
      v-for="(moduleCard, index) in moduleCards"
      :key="index"
      class="rounded-2xl border bg-base-100 transition-colors"
      :class="
        expanded === index && !moduleCard.underConstruction
          ? 'border-primary/30 shadow-sm'
          : 'border-base-300'
      "
    >
      <!-- Header row: badge + name/description + chevron -->
      <button
        class="flex w-full items-center gap-3 p-3 text-left"
        :disabled="moduleCard.underConstruction"
        :aria-expanded="expanded === index"
        @click="toggle(index)"
      >
        <span
          class="grid place-items-center size-11 shrink-0 rounded-xl text-xs font-bold"
          :class="
            expanded === index && !moduleCard.underConstruction
              ? 'bg-primary text-primary-content'
              : 'bg-base-200 text-primary'
          "
        >
          {{ moduleCard.newNamePrefix }}
        </span>
        <span class="flex flex-1 flex-col min-w-0 leading-tight">
          <span class="font-semibold">{{ moduleCard.displayNameSingular }}</span>
          <span
            v-if="moduleCard.description"
            class="text-xs text-base-content/60 mt-0.5"
            :class="{ 'line-clamp-2': expanded !== index }"
          >
            {{ moduleCard.description }}
          </span>
        </span>
        <span
          v-if="moduleCard.underConstruction"
          class="text-xs italic text-base-content/50 shrink-0"
        >
          {{ t('home.picker.soon') }}
        </span>
        <ChevronDownIcon
          v-else
          class="size-5 shrink-0 opacity-40 transition-transform"
          :class="{ 'rotate-180': expanded === index }"
        />
      </button>

      <!-- Expanded body: examples + create/generate -->
      <div v-if="expanded === index && !moduleCard.underConstruction" class="px-3.5 pb-3.5">
        <template v-if="moduleCard.examples.length !== 0">
          <div class="text-[0.7rem] font-bold uppercase tracking-wide text-base-content/40 mb-2">
            {{ t('home.picker.openExample') }}
          </div>
          <div class="flex flex-wrap gap-2 mb-3.5">
            <button
              v-for="(example, exampleIndex) in moduleCard.examples"
              :key="exampleIndex"
              class="rounded-full bg-base-200 px-3 py-1.5 text-sm text-primary"
              @click="openExample(example, moduleCard.newNamePrefix)"
            >
              {{ example.name }}
            </button>
          </div>
        </template>

        <div class="flex gap-2.5">
          <button
            class="btn btn-primary flex-1 h-11 gap-1.5"
            @click="openContent(moduleCard.initialCotent, moduleCard.newNamePrefix)"
          >
            <PlusIcon class="size-5" /> {{ t('home.picker.createNew') }}
          </button>
          <RouterLink
            v-if="moduleCard.generateHref !== undefined"
            :to="
              sourceDocumentId !== undefined
                ? moduleCard.generateHref + '&source=' + sourceDocumentId
                : moduleCard.generateHref
            "
            class="btn btn-outline flex-1 h-11 gap-1.5"
          >
            <Squares2X2Icon class="size-5" /> {{ t('home.picker.generate') }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
