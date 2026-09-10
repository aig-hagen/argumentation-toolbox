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
import {
  AdjustmentsHorizontalIcon,
  ArrowLongRightIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  CursorArrowRaysIcon,
  PlusCircleIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import { type Component, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n({ useScope: 'global' })

const {
  linkNames,
  allowHyperLinkCreation = false,
  nodeTapAction,
} = defineProps<{
  linkNames: string[]
  allowHyperLinkCreation?: boolean
  /** Full primary node-tap description for this module (see the primary-action
      table), e.g. `Rename it` or `Open its acceptance condition`. */
  nodeTapAction?: string
}>()

const linkNamesSlash = computed(() => linkNames.join('/'))
const hasTypes = computed(() => linkNames.length > 1)

const nodeTapActionLower = computed(() => {
  const action = nodeTapAction ?? t('help.gestures.defaultTapAction')
  return action.charAt(0).toLowerCase() + action.slice(1)
})

interface GestureRow {
  icon: Component
  title: string
  desc: string
  danger?: boolean
}

const rows = computed<GestureRow[]>(() => {
  const list: GestureRow[] = [
    {
      icon: PlusCircleIcon,
      title: t('help.gestures.doubleTapCanvas.title'),
      desc: t('help.gestures.doubleTapCanvas.desc'),
    },
    {
      icon: CursorArrowRaysIcon,
      title: t('help.gestures.tapArgument.title'),
      desc: t('help.gestures.tapArgument.desc', { action: nodeTapActionLower.value }),
    },
    {
      icon: ArrowLongRightIcon,
      title: t('help.gestures.holdDrag.title'),
      desc: t('help.gestures.holdDrag.desc', { links: linkNamesSlash.value }),
    },
  ]

  if (allowHyperLinkCreation) {
    list.push({
      icon: PlusCircleIcon,
      title: t('help.gestures.addToAttack.title'),
      desc: t('help.gestures.addToAttack.desc'),
    })
  }

  if (hasTypes.value) {
    list.push({
      icon: AdjustmentsHorizontalIcon,
      title: t('help.gestures.selector.title'),
      desc: t('help.gestures.selector.desc', { links: linkNamesSlash.value }),
    })
    list.push({
      icon: CursorArrowRaysIcon,
      title: t('help.gestures.tapLink.title', { links: linkNamesSlash.value }),
      desc: t('help.gestures.tapLink.desc'),
    })
  } else {
    list.push({
      icon: TrashIcon,
      title: t('help.gestures.longPressLink.title', { links: linkNamesSlash.value }),
      desc: t('help.gestures.longPressLink.desc'),
      danger: true,
    })
  }

  list.push(
    {
      icon: ArrowsPointingOutIcon,
      title: t('help.gestures.drag.title'),
      desc: t('help.gestures.drag.desc'),
    },
    {
      icon: ArrowsPointingInIcon,
      title: t('help.gestures.fitView.title'),
      desc: t('help.gestures.fitView.desc'),
    },
    {
      icon: SparklesIcon,
      title: t('help.gestures.relayout.title'),
      desc: t('help.gestures.relayout.desc'),
    },
  )

  return list
})
</script>

<template>
  <ul class="flex flex-col">
    <li
      v-for="(row, index) in rows"
      :key="index"
      class="flex items-center gap-3.5 py-3 border-b border-base-200 last:border-b-0"
    >
      <span
        class="grid place-items-center size-10 shrink-0 rounded-xl bg-base-200"
        :class="row.danger ? 'text-error' : 'text-primary/80'"
      >
        <component :is="row.icon" class="size-[1.4rem]" />
      </span>
      <span class="min-w-0">
        <span class="block text-sm font-semibold">{{ row.title }}</span>
        <span class="block text-xs text-base-content/60 mt-0.5">{{ row.desc }}</span>
      </span>
    </li>
  </ul>
</template>
