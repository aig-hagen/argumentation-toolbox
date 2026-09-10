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
import { useI18n } from 'vue-i18n'

import HelpControls from '@/modules/common/help/HelpControls.vue'
import HelpGestures from '@/modules/common/help/HelpGestures.vue'
import HelpLinks from '@/modules/common/help/HelpLinks.vue'
import { useLayoutMode } from '@/modules/common/layout/useLayoutMode'
import WindowShell from '@/modules/common/window/WindowShell.vue'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  linkNames: string[]
  allowHyperLinkCreation?: boolean
  nodeTapAction?: string
}>()

const open = defineModel('open', { required: true })

const { layoutMode } = useLayoutMode()
</script>

<template>
  <WindowShell
    v-model:open="open"
    :title="layoutMode === 'compact' ? t('help.howToEdit') : t('menu.help')"
    :initial-position="{ x: 256, y: 256 }"
    :intitalSize="{ width: 576, height: 448 }"
  >
    <div class="p-4">
      <template v-if="layoutMode === 'compact'">
        <HelpGestures
          :link-names="props.linkNames"
          :allow-hyper-link-creation="props.allowHyperLinkCreation"
          :node-tap-action="props.nodeTapAction"
        />
        <HelpLinks />
      </template>
      <template v-else>
        <HelpLinks legal-only />
        <HelpControls
          :link-names="props.linkNames"
          :allow-hyper-link-creation="props.allowHyperLinkCreation"
        />
      </template>
    </div>
  </WindowShell>
</template>
