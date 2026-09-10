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
const { minWidth = '7rem', maxWidth = '14rem' } = defineProps<{
  label?: string
  title?: string
  minWidth?: string
  maxWidth?: string
}>()
</script>

<template>
  <div
    class="flex flex-col gap-0.5 grow shrink"
    :style="{ flexBasis: minWidth, minWidth, maxWidth }"
  >
    <div v-if="label || $slots['label-suffix']" class="flex items-center gap-1">
      <span
        v-if="label"
        class="text-[0.65rem] font-medium uppercase tracking-wide text-base-content/50 truncate"
        :title="title"
      >
        {{ label }}
      </span>
      <slot name="label-suffix" />
    </div>
    <slot />
  </div>
</template>
