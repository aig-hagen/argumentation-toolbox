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
import { computed, type Ref, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { NODE_GREEN, NODE_RED } from '@/modules/common/colors'
import { escapeTexText } from '@/modules/common/export/texEscape'
import type { Highlight } from '@/modules/common/graph-editor/graphEditor'
import type { UUID } from '@/modules/common/ids'

export interface EvaluationArgument {
  id: number
  name: string
}

export interface ExtensionWindowQueryData {
  stateId: UUID
  extensions: EvaluationArgument[][]
  evaluationDurationInMs: number
}

export function useExtensionWindowBase(
  selectedMode: { readonly value: string },
  query: { data: Readonly<Ref<ExtensionWindowQueryData | undefined>> },
) {
  const { t } = useI18n({ useScope: 'global' })

  const selectedExtension = ref<string | undefined>(undefined)

  const selectionHint = computed(() =>
    selectedMode.value === 'enumerate'
      ? t('evaluation.extensionWindow.selectExtensionHint')
      : t('evaluation.extensionWindow.selectArgumentHint'),
  )

  const emptyMessage = computed(() =>
    selectedMode.value === 'enumerate'
      ? t('evaluation.extensionWindow.noExtensions')
      : t('evaluation.extensionWindow.noAcceptableArguments'),
  )

  function formatExtension(extension: EvaluationArgument[]) {
    return extension
      .map((e) => e.name)
      .sort()
      .join(', ')
  }

  const dataExtensionsFormatedAndSorted = computed(() => {
    if (query.data.value === undefined) return undefined
    const extensions = query.data.value.extensions
    const formatted =
      selectedMode.value === 'enumerate'
        ? extensions.map((extension) => {
            const nameFormated = formatExtension(extension)
            const extensionIdsSorted = extension.map((a) => a.id).sort()
            return { key: JSON.stringify(extensionIdsSorted), extension, nameFormated }
          })
        : extensions.flatMap((extension) =>
            extension.map((argument) => ({
              key: String(argument.id),
              extension: [argument],
              nameFormated: argument.name,
            })),
          )
    formatted.sort((a, b) => a.nameFormated.localeCompare(b.nameFormated))
    return {
      stateId: query.data.value.stateId,
      formatedAndSorted: formatted,
      evaluationDurationInMs: query.data.value.evaluationDurationInMs,
    }
  })

  const resultItems = computed(
    () =>
      dataExtensionsFormatedAndSorted.value?.formatedAndSorted.map((e) => {
        const nameEscaped = escapeTexText(e.nameFormated)
        return {
          key: e.key,
          label: selectedMode.value === 'enumerate' ? `{${e.nameFormated}}` : e.nameFormated,
          texLabel: selectedMode.value === 'enumerate' ? `\\{${nameEscaped}\\}` : nameEscaped,
        }
      }) ?? [],
  )

  const currentHighlight = computed<Highlight | undefined>(() => {
    if (
      selectedExtension.value === undefined ||
      dataExtensionsFormatedAndSorted.value === undefined
    ) {
      return undefined
    }
    for (const extension of dataExtensionsFormatedAndSorted.value.formatedAndSorted) {
      if (extension.key === selectedExtension.value) {
        return {
          stateId: dataExtensionsFormatedAndSorted.value.stateId,
          groups: [{ nodes: new Set(extension.extension.map((a) => a.id)), color: NODE_GREEN }],
          attackedByFirst: NODE_RED,
        }
      }
    }
    return undefined
  })

  return {
    selectedExtension,
    selectionHint,
    emptyMessage,
    dataExtensionsFormatedAndSorted,
    resultItems,
    currentHighlight,
  }
}
