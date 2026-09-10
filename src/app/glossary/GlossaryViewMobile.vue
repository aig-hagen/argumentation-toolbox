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
import { BookOpenIcon, ChevronLeftIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { glossaryModules, useGlossary } from '@/app/glossary/useGlossary'
import KatexInlineElement from '@/modules/common/tooltip/KatexInlineElement.vue'

const { t } = useI18n({ useScope: 'global' })

const { allEntries, activeModulePrefix, searchQuery, groupedTerms, selectModule, followRef } =
  useGlossary()

const router = useRouter()
</script>

<template>
  <div class="flex flex-col h-dvh w-screen bg-base-100 overflow-hidden">
    <!-- Top bar -->
    <header
      class="flex-none flex items-center gap-1 px-2 pr-3 border-b border-base-300 bg-base-200"
      style="padding-top: calc(env(safe-area-inset-top) + 0.5rem)"
    >
      <button
        class="btn btn-square btn-ghost btn-sm"
        :aria-label="t('glossary.backToEditor')"
        @click="router.push('/')"
      >
        <ChevronLeftIcon class="size-6 opacity-70" />
      </button>
      <span class="flex-1 text-lg font-bold py-2.5">{{ t('glossary.title') }}</span>
    </header>

    <!-- Module selector -->
    <div class="flex-none overflow-x-auto px-3 py-2 border-b border-base-200">
      <div class="flex gap-2 w-max">
        <button
          v-for="m in glossaryModules"
          :key="m.prefix"
          class="px-3.5 h-8 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
          :class="
            m.prefix === activeModulePrefix
              ? 'bg-primary text-primary-content'
              : 'bg-base-200 text-base-content/70'
          "
          @click="selectModule(m.prefix)"
        >
          {{ m.prefix }}
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="flex-none px-4 pt-3 pb-1">
      <label
        class="flex items-center gap-2 h-11 px-3.5 rounded-xl border border-base-300 bg-base-200"
      >
        <MagnifyingGlassIcon class="size-5 text-base-content/40 shrink-0" />
        <input
          v-model="searchQuery"
          type="search"
          class="flex-1 bg-transparent outline-none text-sm placeholder:text-base-content/40"
          :placeholder="t('glossary.searchPlaceholder')"
        />
      </label>
    </div>

    <!-- Entry list -->
    <div
      class="flex-1 overflow-y-auto px-4 pt-2 flex flex-col gap-2.5"
      style="padding-bottom: max(env(safe-area-inset-bottom), 1.25rem)"
    >
      <p v-if="groupedTerms.length === 0" class="text-sm text-base-content/40 px-1 py-4">
        {{ t('glossary.noResults') }}
      </p>
      <template v-for="group in groupedTerms" :key="group.letter">
        <div class="text-xs font-bold text-secondary tracking-wide mt-1.5 px-0.5">
          {{ group.letter }}
        </div>
        <article
          v-for="[key, def] in group.terms"
          :key="key"
          class="rounded-2xl border border-base-300 p-3.5"
        >
          <div class="flex items-start gap-2.5">
            <div class="flex-1 min-w-0">
              <h3 class="text-[15px] font-semibold leading-snug">
                <KatexInlineElement :text="def.title ?? def.label" />
              </h3>
              <p class="mt-1.5 text-[13px] leading-relaxed text-base-content/70">
                <template v-for="(part, i) in def.content" :key="i">
                  <KatexInlineElement v-if="typeof part === 'string'" :text="part" />
                  <button
                    v-else-if="allEntries[part.ref]"
                    class="text-primary underline underline-offset-2"
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
            <a
              v-if="def.reference"
              :href="def.reference.href"
              :title="def.reference.label"
              target="_blank"
              rel="noopener noreferrer"
              class="grid place-items-center size-7 rounded-lg bg-base-200 text-primary shrink-0"
            >
              <BookOpenIcon class="size-4" />
            </a>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>
