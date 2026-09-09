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
import { CheckIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useI18n } from 'vue-i18n'

import {
  type Notification,
  NotificationType,
} from '@/modules/common/notifications/useNotifications'

const { t } = useI18n({ useScope: 'global' })

const { notifications, placement = 'end' } = defineProps<{
  notifications: Notification[]
  /** Horizontal placement of the toast stack. Mobile uses `center` to clear the command bar. */
  placement?: 'end' | 'center'
}>()
</script>

<template>
  <!-- Mobile: compact dark pills docked top-center; the wrapper ignores pointers so the
       canvas stays reachable underneath, and only a dismiss button re-enables them. -->
  <div
    v-if="placement === 'center'"
    role="status"
    aria-live="polite"
    aria-atomic="false"
    class="toast toast-top toast-center pointer-events-none w-full max-w-96 px-3"
    style="top: calc(env(safe-area-inset-top, 0px) + 4rem)"
  >
    <div
      v-for="notification of notifications"
      :key="notification.key"
      :role="notification.type === NotificationType.ERROR ? 'alert' : undefined"
      class="pointer-events-auto flex items-center gap-2.5 rounded-full bg-neutral px-4 py-2.5 text-neutral-content shadow-lg"
    >
      <CheckIcon
        v-if="notification.type === NotificationType.SUCCESS"
        class="size-4 shrink-0 text-success"
      />
      <ExclamationTriangleIcon v-else class="size-4 shrink-0 text-error" />
      <div class="min-w-0 text-sm font-medium leading-tight">
        <span class="block truncate">{{ notification.title }}</span>
        <span v-if="notification.description" class="block truncate text-xs font-normal opacity-70">
          {{ notification.description }}
        </span>
      </div>
      <button
        v-if="notification.type === NotificationType.ERROR"
        class="btn btn-square btn-xs btn-ghost -mr-1"
        @click="notification.remove()"
        :title="t('common.actions.dismiss')"
      >
        <XMarkIcon class="size-4" />
      </button>
    </div>
  </div>

  <!-- Desktop: full alert cards. -->
  <div
    v-else
    role="status"
    aria-live="polite"
    aria-atomic="false"
    class="toast toast-top toast-end"
  >
    <div
      v-for="notification of notifications"
      :key="notification.key"
      :role="notification.type === NotificationType.ERROR ? 'alert' : undefined"
      class="alert max-w-92"
      :class="{
        'alert-success': notification.type === NotificationType.SUCCESS,
        'alert-error': notification.type === NotificationType.ERROR,
      }"
    >
      <div>
        <h3 class="font-bold">{{ notification.title }}</h3>
        <div v-if="notification.description" class="text-xs whitespace-pre-wrap">
          {{ notification.description }}
        </div>
      </div>
      <button
        v-if="notification.type === NotificationType.ERROR"
        class="btn btn-square btn-xs ml-2 btn-ghost"
        @click="notification.remove()"
        :title="t('common.actions.dismiss')"
      >
        <XMarkIcon class="size-4"></XMarkIcon>
      </button>
    </div>
  </div>
</template>
