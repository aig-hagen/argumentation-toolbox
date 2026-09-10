/*
 * AgonProject - The platform to explore different approaches to formal argumentation.
 *
 * Copyright (C) 2026  Artificial Intelligence Group at the Faculty of Mathematics and Computer Science of the FernUniversität in Hagen <https://www.fernuni-hagen.de/aig/en/>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import copy from 'copy-to-clipboard'
import type { IDBPDatabase } from 'idb'
import type { Objectish } from 'immer'
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { exportFileName, nextDocumentName } from '@/app/home/homeControllerHelpers'
import type { ModuleConfig } from '@/app/home/moduleConfig'
import type { DocumentsDB } from '@/modules/common/documents/db'
import {
  loadDocumentState,
  useDocumentContent,
  useDocumentMetadata,
  useSelectedDocumentId,
} from '@/modules/common/documents/useDocuments'
import type { ExportFileData } from '@/modules/common/export'
import { saveToFile } from '@/modules/common/export/saveFile'
import type { HistoryState } from '@/modules/common/graph-editor/graphEditor'
import { useNotifications } from '@/modules/common/notifications/useNotifications'
import { canNativeShare } from '@/modules/common/share/nativeShare'
import { uploadShare } from '@/modules/common/share/useShare'
import { isShortcut, REDO_SHORTCUT, UNDO_SHORTCUT } from '@/modules/common/shortcuts'
import {
  type DocumentState,
  possibleRedos,
  possibleUndos,
  redoContent,
  setNewContent,
  undoContent,
} from '@/modules/common/state'

/** The controller object shared by the desktop and mobile home shells. */
export type HomeController<DocumentT extends Objectish> = ReturnType<
  typeof useHomeController<DocumentT>
>

/**
 * Presentation-neutral controller owning document lifecycle, history, file I/O,
 * sharing and notifications. Both the desktop and the mobile home shells consume
 * this same instance instead of duplicating document state.
 */
export function useHomeController<DocumentT extends Objectish>(
  db: IDBPDatabase<DocumentsDB>,
  modules: ModuleConfig<DocumentT>[],
) {
  const { t } = useI18n({ useScope: 'global' })
  const { notifications, addSuccessNotification, addErrorNotification } = useNotifications()

  const { documents, createDocument, deleteDocument, renameDocument } = useDocumentMetadata(
    db,
    modules,
  )
  const { selectedDocumentId, selectDocument } = useSelectedDocumentId(documents)
  const { documentId, documentState, updateDocument, documentModule, documentLoading } =
    useDocumentContent<DocumentT>(db, modules, selectedDocumentId)

  const loadedDocuments = shallowRef<
    {
      id: number
      state: DocumentState<DocumentT>
      module: ModuleConfig<DocumentT>
    }[]
  >([])

  watch(
    [documentId, documentState, documentModule, documentLoading],
    ([documentId, documentState, documentModule, documentLoading]) => {
      if (documentId === undefined) return
      if (documentLoading) return
      loadedDocuments.value = loadedDocuments.value.filter(
        (loadedDocument) => loadedDocument.id !== documentId,
      )

      if (documentState !== undefined && documentModule !== undefined) {
        loadedDocuments.value.push({
          id: documentId,
          state: documentState,
          module: documentModule,
        })
      }
    },
    { immediate: true },
  )

  watch(documents, (metadatas) => {
    loadedDocuments.value = loadedDocuments.value.filter((loadedDocument) =>
      metadatas.some((metadata) => metadata.id === loadedDocument.id),
    )
  })

  function overrideWithContent(content: DocumentT, newNamePrefix: string) {
    if (selectedDocumentId.value === undefined) {
      return
    }
    const selectedDocumentMetadata = documents.value.find(
      (document) => document.id === selectedDocumentId.value,
    )
    if (selectedDocumentMetadata === undefined) {
      return
    }
    if (selectedDocumentMetadata.name.trim() === '') {
      const name = getNextName(newNamePrefix)
      renameDocument(selectedDocumentId.value, name)
    }
    const nextDocumentState = setNewContent(content)
    if (nextDocumentState !== undefined) {
      updateDocument(nextDocumentState)
    }
  }

  async function createAndSelectBlankDocument() {
    const id = await createDocument('', undefined)
    selectDocument(id)
  }

  async function createDocumentWithContent(content: DocumentT, newNamePrefix: string) {
    const name = getNextName(newNamePrefix)
    const id = await createDocument(name, content)
    selectDocument(id)
  }

  function getNextName(newNamePrefix: string) {
    return nextDocumentName(
      documents.value.map((document) => document.name),
      newNamePrefix,
    )
  }

  function undo() {
    const currentState = documentState.value
    if (currentState === undefined) {
      throw new Error('Document state does not exit.')
    }
    const nextDocumentState = undoContent(currentState)
    if (nextDocumentState !== undefined) {
      updateDocument(nextDocumentState)
    }
  }

  function redo() {
    const currentState = documentState.value
    if (currentState === undefined) {
      throw new Error('Document state does not exit.')
    }
    const nextDocumentState = redoContent(currentState)
    if (nextDocumentState !== undefined) {
      updateDocument(nextDocumentState)
    }
  }

  const showCreate = computed(
    () =>
      selectedDocumentId.value !== undefined &&
      (documentLoading.value || documentState.value !== undefined),
  )

  // True while the blank canvas is on screen (no document, or a selected-but-empty
  // one) rather than an editor. A last-selected document is always restored from
  // storage, so `selectedDocumentId` alone can't tell these apart.
  const onBlankCanvas = computed(
    () =>
      selectedDocumentId.value === undefined ||
      (!documentLoading.value && documentState.value === undefined),
  )

  const historyState = computed<HistoryState>(() => {
    const currentState = documentState.value
    if (currentState === undefined) {
      return {
        canUndo: false,
        possibleUndos: 0,
        canRedo: false,
        possibleRedos: 0,
      }
    }
    const possibleUndosLocal = possibleUndos(currentState)
    const possibleRedosLocal = possibleRedos(currentState)
    return {
      canUndo: possibleUndosLocal > 0,

      possibleUndos: possibleUndosLocal,
      canRedo: possibleRedosLocal > 0,
      possibleRedos: possibleRedosLocal,
    }
  })

  function handleEditorShortcut(event: KeyboardEvent) {
    if (isShortcut(UNDO_SHORTCUT, event)) {
      undo()
    } else if (isShortcut(REDO_SHORTCUT, event)) {
      redo()
    }
  }

  async function loadFromFileInput(inputEvent: Event) {
    let fileName: string
    let dataStr: string
    try {
      const input = inputEvent.target as HTMLInputElement
      const files = [...(input.files ?? [])]
      if (files.length === 0) return
      if (files.length !== 1) throw new Error('Only one file can be loaded at a time')
      const file = files[0]!
      fileName = file.name
      dataStr = await loadTextData(file)
    } catch {
      addErrorNotification(t('errors.file.uploadFailed'))
      return
    }

    let unvalidatedData: unknown
    try {
      unvalidatedData = JSON.parse(dataStr)
    } catch {
      addErrorNotification(t('errors.file.notJson'))
      return
    }

    if (typeof unvalidatedData !== 'object' || unvalidatedData === null) {
      addErrorNotification(t('errors.file.unsupportedJson'))
      return
    }

    const importModule = modules.find((module) =>
      module.canLoadFromObject(unvalidatedData as Record<string, unknown>),
    )

    if (importModule === undefined) {
      addErrorNotification(t('errors.file.unsupportedJson'))
      return
    }

    const result = importModule.load(dataStr, fileName)

    if (result.errors !== undefined) {
      for (const error of result.errors) {
        addErrorNotification(
          t('errors.file.loadFailedTitle'),
          t(`errors.import.${error.code}`, { ...error.params, detail: error.detail ?? '' }),
        )
      }
    }
    if (result.data !== undefined) {
      const nameFromJson = (unvalidatedData as Record<string, unknown>).name
      const documentName =
        typeof nameFromJson === 'string'
          ? nameFromJson
          : fileName.endsWith('.json')
            ? fileName.slice(0, -5)
            : fileName
      createDocumentWithContent(result.data, documentName)
      addSuccessNotification(t('errors.file.loaded'))
    }
  }

  async function loadTextData(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        resolve(reader.result as string)
      })
      reader.addEventListener('error', () => {
        const error = reader.error
        if (error === null) {
          throw new Error('Error callback called but reader provided no error.')
        }
        reject(error)
      })
      reader.readAsText(file)
    })
  }

  const shareUrl = ref<string | null>(null)

  async function shareDocument(documentId: number) {
    const metadata = documents.value.find((document) => document.id === documentId)
    const [state, module] = await loadDocumentState(db, modules, documentId)
    if (state === undefined || module === undefined) return
    const content = module.getSaveString(state.current.content, metadata?.name ?? '')
    try {
      const result = await uploadShare(content)
      shareUrl.value = result.url
    } catch {
      addErrorNotification(t('share.actions.createFailed'))
    }
  }

  const isSharing = ref(false)
  const shareCopied = ref(false)
  let shareCopiedTimer: ReturnType<typeof setTimeout> | undefined

  async function quickShareDocument() {
    if (selectedDocumentId.value === undefined || isSharing.value) return
    const documentId = selectedDocumentId.value
    const metadata = documents.value.find((d) => d.id === documentId)
    const [state, module] = await loadDocumentState(db, modules, documentId)
    if (state === undefined || module === undefined) return
    const content = module.getSaveString(state.current.content, metadata?.name ?? '')
    const name = metadata?.name?.trim() || 'Argumentation framework'
    isSharing.value = true
    try {
      const { url } = await uploadShare(content)
      // On touch devices with the Web Share API, hand the link to the native share sheet
      // (WhatsApp, email, …); otherwise — or if it fails — fall back to clipboard copy.
      if (canNativeShare({ url })) {
        try {
          await navigator.share({ title: name, url })
          return
        } catch (error) {
          // User dismissed the sheet: leave it there, don't also copy.
          if (error instanceof DOMException && error.name === 'AbortError') return
          // Any other failure falls through to the clipboard path below.
        }
      }
      copy(url)
      shareCopied.value = true
      clearTimeout(shareCopiedTimer)
      shareCopiedTimer = setTimeout(() => {
        shareCopied.value = false
      }, 2_000)
      addSuccessNotification(t('share.actions.linkCopied'))
    } catch {
      addErrorNotification(t('share.actions.createFailed'))
    } finally {
      isSharing.value = false
    }
  }

  async function saveAsFile(documentId: number) {
    const metadata = documents.value.find((document) => document.id === documentId)
    if (metadata === undefined) {
      return
    }
    const [state, module] = await loadDocumentState(db, modules, documentId)
    if (state === undefined) {
      return
    }
    const fileName = getFileName(metadata.name, module)
    const saveString = module.getSaveString(state.current.content, metadata.name)
    saveToFile(saveString, fileName, 'json')
  }

  async function exportAsFile(documentId: number, fileData: ExportFileData) {
    const metadata = documents.value.find((document) => document.id === documentId)
    if (metadata === undefined) {
      return
    }
    const [_, module] = await loadDocumentState(db, modules, documentId)
    if (module === undefined) {
      return
    }
    const fileName = getFileName(metadata.name, module)
    saveToFile(fileData.content, fileName, fileData.ending)
  }

  function getFileName(name: string, module: ModuleConfig<DocumentT> | undefined) {
    return exportFileName(name, module?.newNamePrefix ?? '')
  }

  return {
    notifications,
    documents,
    createDocument,
    deleteDocument,
    renameDocument,
    selectedDocumentId,
    selectDocument,
    documentModule,
    documentLoading,
    documentState,
    loadedDocuments,
    updateDocument,
    overrideWithContent,
    createAndSelectBlankDocument,
    createDocumentWithContent,
    undo,
    redo,
    showCreate,
    onBlankCanvas,
    historyState,
    handleEditorShortcut,
    loadFromFileInput,
    shareUrl,
    shareDocument,
    isSharing,
    shareCopied,
    quickShareDocument,
    saveAsFile,
    exportAsFile,
  }
}
