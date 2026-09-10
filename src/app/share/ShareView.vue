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
import type { IDBPDatabase } from 'idb'
import type { Objectish } from 'immer'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

import type { ModuleConfig } from '@/app/home/moduleConfig'
import type { DocumentsDB } from '@/modules/common/documents/db'
import {
  LAST_SELECTED_DOCUMENT_KEY,
  useDocumentMetadata,
} from '@/modules/common/documents/useDocuments'
import { notifyStorageFailureOnce } from '@/modules/common/notifications/storageFailure'
import { fetchShare, ShareError } from '@/modules/common/share/useShare'

const { db, modules } = defineProps<{
  db: IDBPDatabase<DocumentsDB>
  modules: ModuleConfig<Objectish>[]
}>()

const { t } = useI18n({ useScope: 'global' })

const route = useRoute()
const router = useRouter()

const errorMessage = ref<string | null>(null)

const { createDocument } = useDocumentMetadata(db, modules)

onMounted(async () => {
  const id = String(route.params['id'])

  let content: string
  try {
    content = await fetchShare(id)
  } catch (e) {
    errorMessage.value =
      e instanceof ShareError
        ? t(`share.load.errors.${e.code}`, e.params)
        : t('share.load.errors.loadFailed')
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    errorMessage.value = t('share.load.errors.invalidData')
    return
  }

  if (typeof parsed !== 'object' || parsed === null) {
    errorMessage.value = t('share.load.errors.unsupportedData')
    return
  }

  const importModule = modules.find((m) => m.canLoadFromObject(parsed as Record<string, unknown>))
  if (importModule === undefined) {
    errorMessage.value = t('share.load.errors.unsupportedType')
    return
  }

  const result = importModule.load(content, '')
  if (result.data === undefined) {
    errorMessage.value = t('share.load.errors.parseFailed')
    return
  }

  const nameFromJson = (parsed as Record<string, unknown>)['name']
  const documentName =
    typeof nameFromJson === 'string' && nameFromJson.trim() !== ''
      ? nameFromJson
      : importModule.newNamePrefix

  const newId = await createDocument(documentName, result.data as Objectish)
  try {
    localStorage.setItem(LAST_SELECTED_DOCUMENT_KEY, String(newId))
  } catch (error) {
    notifyStorageFailureOnce(error)
  }
  await router.replace('/')
})
</script>

<template>
  <div class="h-screen w-screen flex items-center justify-center bg-base-100">
    <div v-if="errorMessage" class="flex flex-col items-center gap-4 text-center max-w-sm">
      <p class="text-error font-medium">{{ errorMessage }}</p>
      <router-link to="/" class="btn btn-primary btn-sm">{{
        t('share.load.goToEditor')
      }}</router-link>
    </div>
    <span v-else class="loading loading-spinner loading-lg text-primary" />
  </div>
</template>
