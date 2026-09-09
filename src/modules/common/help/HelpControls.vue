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
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  REDO_SHORTCUT,
  TOGGLE_GRID_SHORTCUT,
  TOGGLE_PHYSICS_SHORTCUT,
  UNDO_SHORTCUT,
} from '@/modules/common/shortcuts'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  linkNames: string[]
  allowHyperLinkCreation?: boolean
}>()

const linkNamesSlashSeperated = computed(() => props.linkNames.join('/'))
const linkNamesEnumeration = computed(
  () =>
    props.linkNames.slice(0, -1).join(', ') +
    ` ${t('help.controls.listAnd')} ` +
    props.linkNames[props.linkNames.length - 1],
)
</script>
<template>
  <table class="table">
    <thead>
      <tr>
        <th>{{ t('help.controls.action') }}</th>
        <th>{{ t('help.controls.control') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="2" class="font-semibold pt-3 pb-1 opacity-60 text-xs uppercase tracking-wide">
          {{ t('help.controls.sections.argumentsAttacks') }}
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.createArgument') }}</td>
        <td>
          <i18n-t keypath="help.controls.createArgumentControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.leftDoubleClick') }}</kbd></template
            >
          </i18n-t>
        </td>
      </tr>

      <tr>
        <td>{{ t('help.controls.moveArgument') }}</td>
        <td>
          <i18n-t keypath="help.controls.moveArgumentControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.leftClick') }}</kbd></template
            >
          </i18n-t>
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.deleteArgument') }}</td>
        <td>
          <i18n-t keypath="help.controls.deleteArgumentControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.rightClick') }}</kbd></template
            >
          </i18n-t>
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.createLink', { links: linkNamesSlashSeperated }) }}</td>
        <td>
          <i18n-t keypath="help.controls.createLinkControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.rightClick') }}</kbd></template
            >
          </i18n-t>
        </td>
      </tr>
      <tr v-if="props.allowHyperLinkCreation">
        <td>{{ t('help.controls.createCollectiveAttack') }}</td>
        <td>
          <i18n-t keypath="help.controls.createCollectiveAttackControl" tag="span">
            <template #shift><kbd class="kbd">Shift</kbd></template>
            <template #leftClick
              ><kbd class="kbd">{{ t('help.keys.leftClick') }}</kbd></template
            >
            <template #rightClick
              ><kbd class="kbd">{{ t('help.keys.rightClick') }}</kbd></template
            >
          </i18n-t>
        </td>
      </tr>
      <tr v-if="props.linkNames.length > 1">
        <td>{{ t('help.controls.switchLink', { links: linkNamesEnumeration }) }}</td>
        <td>
          <i18n-t keypath="help.controls.switchLinkControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.leftClick') }}</kbd></template
            >
            <template #links>{{ linkNamesSlashSeperated }}</template>
          </i18n-t>
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.deleteLink', { links: linkNamesSlashSeperated }) }}</td>
        <td>
          <i18n-t keypath="help.controls.deleteLinkControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.rightClick') }}</kbd></template
            >
            <template #links>{{ linkNamesSlashSeperated }}</template>
          </i18n-t>
        </td>
      </tr>

      <tr>
        <td colspan="2" class="font-semibold pt-3 pb-1 opacity-60 text-xs uppercase tracking-wide">
          {{ t('help.controls.sections.navigation') }}
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.pan') }}</td>
        <td>
          <i18n-t keypath="help.controls.panControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.leftClick') }}</kbd></template
            >
          </i18n-t>
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.zoom') }}</td>
        <td>
          <i18n-t keypath="help.controls.zoomControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.scrollWheel') }}</kbd></template
            >
          </i18n-t>
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.centerView') }}</td>
        <td>
          <i18n-t keypath="help.controls.centerViewControl" tag="span">
            <template #key
              ><kbd class="kbd">{{ t('help.keys.middleClick') }}</kbd></template
            >
          </i18n-t>
        </td>
      </tr>

      <tr>
        <td colspan="2" class="font-semibold pt-3 pb-1 opacity-60 text-xs uppercase tracking-wide">
          {{ t('help.controls.sections.general') }}
        </td>
      </tr>
      <tr>
        <td>{{ t('menu.undo') }}</td>
        <td>
          <div class="flex gap-1">
            <kbd class="kbd" v-if="UNDO_SHORTCUT.modifiers.ctrl">Ctrl</kbd>
            <kbd class="kbd" v-if="UNDO_SHORTCUT.modifiers.meta">⌘</kbd>
            <kbd class="kbd" v-if="UNDO_SHORTCUT.modifiers.shift">Shift</kbd>
            <kbd class="kbd">{{ UNDO_SHORTCUT.key.toUpperCase() }}</kbd>
          </div>
        </td>
      </tr>
      <tr>
        <td>{{ t('menu.redo') }}</td>
        <td>
          <div class="flex gap-1">
            <kbd class="kbd" v-if="REDO_SHORTCUT.modifiers.ctrl">Ctrl</kbd>
            <kbd class="kbd" v-if="REDO_SHORTCUT.modifiers.meta">⌘</kbd>
            <kbd class="kbd" v-if="REDO_SHORTCUT.modifiers.shift">Shift</kbd>
            <kbd class="kbd">{{ REDO_SHORTCUT.key.toUpperCase() }}</kbd>
          </div>
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.toggleGrid') }}</td>
        <td>
          <kbd class="kbd">{{ TOGGLE_GRID_SHORTCUT.key.toUpperCase() }}</kbd>
        </td>
      </tr>
      <tr>
        <td>{{ t('help.controls.togglePhysics') }}</td>
        <td>
          <kbd class="kbd">{{ TOGGLE_PHYSICS_SHORTCUT.key.toUpperCase() }}</kbd>
        </td>
      </tr>
    </tbody>
  </table>
</template>
