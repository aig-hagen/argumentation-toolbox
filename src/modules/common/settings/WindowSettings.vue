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
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'

import SettingsContent from '@/modules/common/settings/SettingsContent.vue'

const { t } = useI18n({ useScope: 'global' })
const dialog = useTemplateRef('dialog')

function open() {
  dialog.value?.showModal()
}

defineExpose({ open })
</script>

<template>
  <dialog class="modal" ref="dialog">
    <div class="modal-box max-w-sm">
      <form method="dialog">
        <button
          class="btn btn-sm btn-square btn-ghost absolute right-2 top-2"
          :aria-label="t('common.actions.close')"
        >
          <XMarkIcon class="size-4" />
        </button>
      </form>
      <h3 class="text-lg font-bold mb-5">{{ t('settings.title') }}</h3>

      <SettingsContent />
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>{{ t('common.actions.close') }}</button>
    </form>
  </dialog>
</template>
