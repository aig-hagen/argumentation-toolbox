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
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'

import TermTooltip from '@/modules/common/tooltip/TermTooltip.vue'

const { mode } = defineProps<{ mode: string }>()

// enumerate is self-explanatory; credulous/skeptical point at their glossary term.
const termId = computed(() =>
  mode === 'credulous'
    ? 'credulousAcceptance'
    : mode === 'skeptical'
      ? 'skepticalAcceptance'
      : undefined,
)
</script>

<template>
  <TermTooltip v-if="termId" :id="termId" trigger-class="cursor-help inline-flex">
    <InformationCircleIcon
      class="size-3.5 text-base-content/40 hover:text-base-content/70 transition-colors"
    />
  </TermTooltip>
</template>
