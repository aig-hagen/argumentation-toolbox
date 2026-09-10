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
import { CheckIcon, ClipboardIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import copy from 'copy-to-clipboard'
import { ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const { url } = defineProps<{ url: string | null }>()
const emit = defineEmits<{ close: [] }>()

const dialogRef = useTemplateRef('dialog')
const copied = ref(false)

watch(
  () => url,
  (val) => {
    if (val) {
      dialogRef.value?.showModal()
    } else {
      dialogRef.value?.close()
    }
    copied.value = false
  },
)

function onCopy() {
  if (!url) return
  copy(url)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

function onClose() {
  emit('close')
}
</script>

<template>
  <dialog ref="dialog" class="modal" @close="onClose">
    <div class="modal-box max-w-md p-5">
      <form method="dialog">
        <button
          class="btn btn-sm btn-square btn-ghost absolute right-2 top-2"
          :aria-label="t('common.actions.close')"
        >
          <XMarkIcon class="size-4" />
        </button>
      </form>
      <h3 class="text-base font-bold mb-1 pr-8">{{ t('share.title') }}</h3>
      <p class="text-xs text-base-content/70 mb-3">
        {{ t('share.description') }}
      </p>
      <div class="flex gap-2">
        <input
          type="text"
          :value="url ?? ''"
          readonly
          class="input input-sm input-bordered flex-1 font-mono text-xs"
          @click="($event.target as HTMLInputElement).select()"
        />
        <button
          class="btn btn-sm btn-square btn-primary"
          @click="onCopy"
          :title="copied ? t('share.copied') : t('share.copyLink')"
        >
          <CheckIcon v-if="copied" class="size-4" />
          <ClipboardIcon v-else class="size-4" />
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>{{ t('common.actions.close') }}</button>
    </form>
  </dialog>
</template>
