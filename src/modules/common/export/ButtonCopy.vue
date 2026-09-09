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
import { ClipboardDocumentCheckIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline'
import copy from 'copy-to-clipboard'
import { computed, ref, useSlots } from 'vue'
import { useI18n } from 'vue-i18n'

import TexIcon from '@/modules/common/export/TexIcon.vue'

const { t } = useI18n({ useScope: 'global' })
const slots = useSlots()
const hasLabel = computed(() => slots.default !== undefined)

const {
  text,
  iconOnly = false,
  tex = false,
  title,
} = defineProps<{
  text: string | undefined
  /** Renders just the icon, no "Copy" label. */
  iconOnly?: boolean
  /** Use the TeX glyph instead of the clipboard icon (for LaTeX copy actions). */
  tex?: boolean
  title?: string
}>()

const emit = defineEmits<{ copied: [] }>()

const showCopied = ref(false)
let timeoutId: ReturnType<typeof setTimeout>

async function copyToClipboard() {
  if (text === undefined) {
    return
  }
  const success = await copy(text)

  if (success === false) {
    return
  }
  emit('copied')
  showCopied.value = true
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId)
  }
  timeoutId = setTimeout(() => (showCopied.value = false), 500)
}
</script>

<template>
  <button @click="copyToClipboard" :disabled="text === undefined" :title="title">
    <template v-if="showCopied">
      <ClipboardDocumentCheckIcon class="size-4"></ClipboardDocumentCheckIcon>
      <template v-if="!iconOnly">{{ t('export.button.copied') }}</template>
    </template>
    <template v-else>
      <TexIcon v-if="tex" class="size-4"></TexIcon>
      <ClipboardDocumentIcon v-else class="size-4"></ClipboardDocumentIcon>
      <template v-if="!iconOnly">
        <i18n-t v-if="hasLabel" keypath="export.button.copy" tag="span" scope="global">
          <template #label><slot></slot></template>
        </i18n-t>
        <span v-else>{{ t('export.button.copyBare') }}</span>
      </template>
    </template>
  </button>
</template>
