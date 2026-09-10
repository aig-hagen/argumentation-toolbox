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
import { CheckCircleIcon } from '@heroicons/vue/24/solid'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Tutorial, TutorialContext } from '@/modules/common/tutorial/types'
import { TUTORIAL_INSTANCE_KEY, useTutorial } from '@/modules/common/tutorial/useTutorial'
import WindowShell from '@/modules/common/window/WindowShell.vue'

const { tutorials, context } = defineProps<{
  tutorials: Tutorial[]
  context: TutorialContext
}>()

const open = defineModel('open', { required: true })

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n({ useScope: 'global' })

const instanceId = inject(TUTORIAL_INSTANCE_KEY, '')
const { isTouchDevice, isTutorialDone, startTutorial } = useTutorial()

const visibleTutorials = computed(() =>
  tutorials.filter((tutorial) => !(tutorial.desktopOnly && isTouchDevice.value)),
)

function launch(tutorial: Tutorial) {
  startTutorial(tutorial, context, instanceId)
  open.value = false
  emit('close')
}
</script>

<template>
  <WindowShell
    v-model:open="open"
    :title="t('tutorial.title')"
    :initial-position="{ x: 128, y: 128 }"
    :intitalSize="{ width: 360, height: 300 }"
  >
    <div class="p-4 flex flex-col gap-3">
      <p class="text-sm text-base-content/60">
        {{ t('tutorial.intro') }}
      </p>
      <div
        v-for="tutorial in visibleTutorials"
        :key="tutorial.id"
        class="flex items-start justify-between gap-3 p-3 rounded-lg border border-base-300 bg-base-200/50"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-sm">{{ tutorial.name }}</span>
            <CheckCircleIcon
              v-if="isTutorialDone(tutorial.id)"
              class="size-4 text-success shrink-0"
              :title="t('tutorial.completed')"
            />
          </div>
          <p class="text-xs text-base-content/50 mt-0.5">{{ tutorial.description }}</p>
        </div>
        <button class="btn btn-primary btn-xs shrink-0" @click="launch(tutorial)">
          {{
            isTutorialDone(tutorial.id) ? `↺ ${t('tutorial.restart')}` : `▶ ${t('tutorial.start')}`
          }}
        </button>
      </div>
    </div>
  </WindowShell>
</template>
