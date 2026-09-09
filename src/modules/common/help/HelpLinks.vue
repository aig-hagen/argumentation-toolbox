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
import { ArrowUpRightIcon, ShieldCheckIcon, UserGroupIcon } from '@heroicons/vue/24/outline'
import { type Component, computed } from 'vue'
import { useI18n } from 'vue-i18n'

import GithubMarkIcon from '@/modules/common/help/GithubMarkIcon.vue'

const { t } = useI18n({ useScope: 'global' })

const { legalOnly = false } = defineProps<{ legalOnly?: boolean }>()

const sourceTree = import.meta.env.VITE_APP_SOURCE_TREE
const sourceLink = `https://github.com/aig-hagen/AgonProject/tree/${sourceTree}`

type Link = { label: string; href: string; img?: string; icon?: Component; legal?: boolean }

const links = computed<Link[]>(() => [
  { label: 'AIG Hagen', href: 'https://www.fernuni-hagen.de/aig/en/', img: '/favicon-32x32.png' },
  { label: 'TweetyProject', href: 'https://tweetyproject.org', img: '/tweety-logo.png' },
  { label: t('help.links.source', { tree: sourceTree }), href: sourceLink, icon: GithubMarkIcon },
  { label: t('help.links.thirdParty'), href: '/third-party', icon: UserGroupIcon, legal: true },
  { label: t('help.links.privacy'), href: '/privacy', icon: ShieldCheckIcon, legal: true },
])

const shownLinks = computed(() => (legalOnly ? links.value.filter((l) => l.legal) : links.value))
</script>
<template>
  <div class="my-4">
    <div class="flex flex-wrap gap-x-4 gap-y-1.5">
      <a
        v-for="link in shownLinks"
        :key="link.label"
        class="group inline-flex items-center gap-1.5 text-sm text-base-content/60 hover:text-base-content transition-colors"
        target="_blank"
        rel="noopener"
        :href="link.href"
      >
        <img v-if="link.img" :src="link.img" class="size-4" alt="" />
        <component :is="link.icon" v-else class="size-4" />
        {{ link.label }}
        <ArrowUpRightIcon class="size-3 opacity-40 group-hover:opacity-70" />
      </a>
    </div>
  </div>
</template>
