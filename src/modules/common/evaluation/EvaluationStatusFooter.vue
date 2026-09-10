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
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'

import { EVALUATION_STICKY_FOOTER_KEY } from '@/modules/common/evaluation/hostContext'
import ButtonCopy from '@/modules/common/export/ButtonCopy.vue'
import { useNotifications } from '@/modules/common/notifications/useNotifications'

const { t } = useI18n({ useScope: 'global' })

// Shared status/copy line for every evaluation result kind. The mobile host pins it to
// the sheet bottom (injected key); desktop leaves it in flow. Copy buttons appear only
// when both plain and TeX text are supplied.
const props = defineProps<{
  statusLine?: string
  copyText?: string
  copyTextTex?: string
  /** Localized plural noun for the copy notification, e.g. "extensions". */
  resultNoun?: string
}>()

const stickyFooter = inject(EVALUATION_STICKY_FOOTER_KEY, false)

const showCopy = computed(() => props.copyText !== undefined && props.copyTextTex !== undefined)

const { addSuccessNotification } = useNotifications()

function notifyCopied(format: 'plain' | 'tex') {
  const noun = props.resultNoun ?? t('evaluation.nouns.results')
  addSuccessNotification(
    format === 'tex'
      ? t('evaluation.status.copiedTex', { noun })
      : t('evaluation.status.copied', { noun }),
  )
}
</script>

<template>
  <div
    v-if="statusLine || showCopy"
    data-evaluation-footer
    class="flex items-center justify-between gap-2"
    :class="
      stickyFooter &&
      'sticky bottom-0 z-10 -mx-3 mt-auto border-t border-base-300 bg-base-100 px-3 py-1.5 shadow-footer'
    "
  >
    <p v-if="statusLine" class="label min-w-0 truncate">{{ statusLine }}</p>
    <div v-if="showCopy" class="join ml-auto shrink-0">
      <ButtonCopy
        class="btn join-item btn-square btn-xs btn-ghost"
        :text="copyText!"
        icon-only
        :title="t('evaluation.status.copyPlain')"
        @copied="notifyCopied('plain')"
      />
      <ButtonCopy
        class="btn join-item btn-square btn-xs btn-ghost"
        :text="copyTextTex!"
        icon-only
        tex
        :title="t('evaluation.status.copyTex')"
        @copied="notifyCopied('tex')"
      />
    </div>
  </div>
</template>
