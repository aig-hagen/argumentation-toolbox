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
import type { BipoloarArgumentation } from '@/modules/bipolar-argumentation/model'
import {
  buildIccmaText,
  exportLatexArgumentationCommon,
  latexExportCommonConfig,
} from '@/modules/common/argumentation/export'
import type { ArgumentData, ArgumentId } from '@/modules/common/argumentation/model'
import { type ExportConfig, ExportFormatId, type ExportStyleOptions } from '@/modules/common/export'
import { IdMapping } from '@/modules/common/ids'

const exportLatexBipolarArgumentation: ExportConfig<BipoloarArgumentation<ArgumentData>> = {
  ...latexExportCommonConfig(),
  export(document, styleOptions?: ExportStyleOptions) {
    const args = document.arguments()
    const attacks = document.attacks()
    const supports = document.supports()
    return exportLatexArgumentationCommon(args, attacks, supports, styleOptions)
  },
}

const exportICCMA: ExportConfig<BipoloarArgumentation<ArgumentData>> = {
  id: ExportFormatId.Iccma,
  name: 'ICCMA',
  references: [
    {
      label: 'ICCMA 2025 Rules (extended for BAF)',
      url: 'https://argumentationcompetition.org/2025/rules.html',
    },
  ],
  extension: 'baf',
  export(document) {
    let numberOfArguments = 0
    const idMapping = new IdMapping<ArgumentId, number>()
    for (const [id] of document.arguments()) {
      idMapping.add(id, ++numberOfArguments)
    }

    function* lines(): IterableIterator<string> {
      for (const [sourceId, targetId] of document.attacks()) {
        yield `${idMapping.getOrFail(sourceId)} ${idMapping.getOrFail(targetId)}`
      }
      for (const [sourceId, targetId] of document.supports()) {
        yield `s ${idMapping.getOrFail(sourceId)} ${idMapping.getOrFail(targetId)}`
      }
    }

    return { text: buildIccmaText('baf', numberOfArguments, lines()) }
  },
}

const exportTGFBipolarArgumentation: ExportConfig<BipoloarArgumentation<ArgumentData>> = {
  id: ExportFormatId.Tgf,
  name: 'Trivial Graph Format (TGF)',
  references: [{ label: 'TGF Format', url: 'https://en.wikipedia.org/wiki/Trivial_Graph_Format' }],
  extension: 'tgf',
  export(document) {
    let numberOfArguments = 0
    const idMapping = new IdMapping<ArgumentId, number>()
    for (const [id] of document.arguments()) {
      idMapping.add(id, ++numberOfArguments)
    }

    let text = ''
    for (const [id] of document.arguments()) {
      text += `${idMapping.getOrFail(id)}\r\n`
    }
    text += '#\r\n'
    for (const [sourceId, targetId] of document.attacks()) {
      text += `${idMapping.getOrFail(sourceId)} ${idMapping.getOrFail(targetId)}\r\n`
    }
    for (const [sourceId, targetId] of document.supports()) {
      text += `${idMapping.getOrFail(sourceId)} ${idMapping.getOrFail(targetId)} s\r\n`
    }
    text = text.trimEnd()
    return { text }
  },
}

export const availableExports = [
  exportLatexBipolarArgumentation,
  exportICCMA,
  exportTGFBipolarArgumentation,
]
