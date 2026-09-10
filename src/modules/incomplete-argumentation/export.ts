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
import {
  buildIccmaText,
  exportLatexArgumentationCommon,
  latexExportCommonConfig,
} from '@/modules/common/argumentation/export'
import { type ExportConfig, ExportFormatId, type ExportStyleOptions } from '@/modules/common/export'
import { IdMapping } from '@/modules/common/ids'
import type {
  IafArgumentData,
  IncompleteArgumentation,
} from '@/modules/incomplete-argumentation/model'

function* emptyIterator(): IterableIterator<[number, number]> {}

const exportLatexIncompleteArgumentation: ExportConfig<IncompleteArgumentation<IafArgumentData>> = {
  ...latexExportCommonConfig(),
  export(document: IncompleteArgumentation<IafArgumentData>, styleOptions?: ExportStyleOptions) {
    function* allAttacks(): IterableIterator<[number, number]> {
      yield* document.definiteAttacks()
      yield* document.uncertainAttacks()
    }

    return exportLatexArgumentationCommon(
      document.arguments(),
      allAttacks(),
      emptyIterator(),
      styleOptions,
      {
        argumentOptions: (id) => (document.getArgument(id).uncertain ? 'incomplete' : ''),
        attackOptions: (s, t) => (document.hasUncertainAttack(s, t) ? 'incomplete' : ''),
      },
    )
  },
}

const exportICCMA: ExportConfig<IncompleteArgumentation<IafArgumentData>> = {
  id: ExportFormatId.Iccma,
  name: 'ICCMA',
  references: [
    {
      label: 'ICCMA 2025 Rules (extended for IAF)',
      url: 'https://argumentationcompetition.org/2025/rules.html',
    },
  ],
  extension: 'iaf',
  export(document) {
    let numberOfArguments = 0
    const idMapping = new IdMapping<number, number>()
    for (const [id] of document.arguments()) {
      idMapping.add(id, ++numberOfArguments)
    }

    function* lines(): IterableIterator<string> {
      for (const [id] of document.uncertainArguments()) {
        yield `u ${idMapping.getOrFail(id)}`
      }
      for (const [sourceId, targetId] of document.definiteAttacks()) {
        yield `${idMapping.getOrFail(sourceId)} ${idMapping.getOrFail(targetId)}`
      }
      for (const [sourceId, targetId] of document.uncertainAttacks()) {
        yield `u ${idMapping.getOrFail(sourceId)} ${idMapping.getOrFail(targetId)}`
      }
    }

    return { text: buildIccmaText('iaf', numberOfArguments, lines()) }
  },
}

const exportTGFIncompleteArgumentation: ExportConfig<IncompleteArgumentation<IafArgumentData>> = {
  id: ExportFormatId.Tgf,
  name: 'Trivial Graph Format (TGF)',
  references: [{ label: 'TGF Format', url: 'https://en.wikipedia.org/wiki/Trivial_Graph_Format' }],
  extension: 'tgf',
  export(document) {
    let numberOfArguments = 0
    const idMapping = new IdMapping<number, number>()
    const uncertainArgumentIds = new Set<number>()

    for (const [id, data] of document.arguments()) {
      idMapping.add(id, ++numberOfArguments)
      if (data.uncertain) uncertainArgumentIds.add(id)
    }

    let text = ''
    for (const [id] of document.arguments()) {
      const numberId = idMapping.getOrFail(id)
      text += uncertainArgumentIds.has(id) ? `${numberId} u\r\n` : `${numberId}\r\n`
    }
    text += '#\r\n'
    for (const [sourceId, targetId] of document.definiteAttacks()) {
      text += `${idMapping.getOrFail(sourceId)} ${idMapping.getOrFail(targetId)}\r\n`
    }
    for (const [sourceId, targetId] of document.uncertainAttacks()) {
      text += `${idMapping.getOrFail(sourceId)} ${idMapping.getOrFail(targetId)} u\r\n`
    }
    text = text.trimEnd()
    return { text }
  },
}

export const availableExports: ExportConfig<IncompleteArgumentation<IafArgumentData>>[] = [
  exportLatexIncompleteArgumentation,
  exportICCMA,
  exportTGFIncompleteArgumentation,
]
