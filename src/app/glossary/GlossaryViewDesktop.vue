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
import { ArrowLeftIcon, BookOpenIcon } from '@heroicons/vue/24/outline'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import { glossaryModules, useGlossary } from '@/app/glossary/useGlossary'
import KatexInlineElement from '@/modules/common/tooltip/KatexInlineElement.vue'

const { t } = useI18n({ useScope: 'global' })

const {
  allEntries,
  activeModulePrefix,
  activeTermKey,
  searchQuery,
  groupedTerms,
  activeDefinition,
  navigate,
  followRef,
} = useGlossary()

// Auto-select the first term when the module changes or no valid term is in the URL.
watch(
  activeModulePrefix,
  (prefix) => {
    const glossary = glossaryModules.find((m) => m.prefix === prefix)?.glossary ?? {}
    if (!activeTermKey.value || !glossary[activeTermKey.value]) {
      const first = Object.entries(glossary).sort(([, a], [, b]) =>
        (a.title ?? a.label).localeCompare(b.title ?? b.label),
      )[0]
      if (first) navigate(prefix, first[0])
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="h-screen flex flex-col bg-base-100 overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-4 px-6 py-3 border-b border-base-300 shrink-0">
      <RouterLink to="/" class="btn btn-sm btn-ghost gap-1">
        <ArrowLeftIcon class="size-4" />
        {{ t('glossary.backToEditor') }}
      </RouterLink>
      <h1 class="text-lg font-bold">{{ t('glossary.title') }}</h1>
    </div>

    <!-- Module tabs -->
    <div role="tablist" class="flex gap-0 px-6 border-b border-base-300 shrink-0 overflow-x-auto">
      <button
        v-for="m in glossaryModules"
        :key="m.prefix"
        role="tab"
        class="px-4 py-2.5 text-sm border-b-2 whitespace-nowrap transition-colors"
        :class="
          m.prefix === activeModulePrefix
            ? 'border-primary text-primary font-medium'
            : 'border-transparent text-base-content/60 hover:text-base-content'
        "
        @click="navigate(m.prefix, '')"
      >
        {{ m.prefix }}
      </button>
    </div>

    <!-- Two-panel body -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left: term list -->
      <div class="w-64 shrink-0 flex flex-col border-r border-base-300 overflow-hidden">
        <div class="p-3 border-b border-base-300">
          <input
            v-model="searchQuery"
            type="search"
            class="input input-sm w-full"
            :placeholder="t('glossary.searchPlaceholder')"
          />
        </div>
        <div class="overflow-y-auto flex-1 py-2">
          <p v-if="groupedTerms.length === 0" class="text-sm text-base-content/40 px-4 py-2">
            {{ t('glossary.noResults') }}
          </p>
          <template v-for="group in groupedTerms" :key="group.letter">
            <div
              class="px-4 pt-2 pb-0.5 text-xs font-semibold text-secondary uppercase tracking-wide"
            >
              {{ group.letter }}
            </div>
            <button
              v-for="[key, def] in group.terms"
              :key="key"
              class="w-full text-left px-4 py-1.5 text-sm hover:bg-base-200 truncate"
              :class="{ 'bg-base-200 font-medium': key === activeTermKey }"
              @click="navigate(activeModulePrefix, key)"
            >
              <KatexInlineElement :text="def.title ?? def.label" />
            </button>
          </template>
        </div>
      </div>

      <!-- Right: definition panel -->
      <div class="flex-1 overflow-y-auto p-8">
        <div v-if="activeDefinition" class="max-w-2xl">
          <div class="flex items-start gap-2 mb-4">
            <h2 class="text-xl font-bold leading-snug">
              <KatexInlineElement :text="activeDefinition.title ?? activeDefinition.label" />
            </h2>
            <a
              v-if="activeDefinition.reference"
              :href="activeDefinition.reference.href"
              :title="activeDefinition.reference.label"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-1 text-base-content/40 hover:text-base-content/70 shrink-0"
            >
              <BookOpenIcon class="size-5" />
            </a>
          </div>
          <p class="text-base-content/80 leading-relaxed">
            <template v-for="(part, i) in activeDefinition.content" :key="i">
              <KatexInlineElement v-if="typeof part === 'string'" :text="part" />
              <button
                v-else-if="allEntries[part.ref]"
                class="text-primary underline underline-offset-2 hover:opacity-70"
                @click="followRef(part.ref)"
              >
                <KatexInlineElement
                  :text="part.label ?? allEntries[part.ref]!.definition.label ?? part.ref"
                />
              </button>
              <span v-else class="text-base-content/60">
                <KatexInlineElement :text="part.label ?? part.ref" />
              </span>
            </template>
          </p>
        </div>
        <p v-else class="text-sm text-base-content/40">{{ t('glossary.selectTerm') }}</p>
      </div>
    </div>
  </div>
</template>
