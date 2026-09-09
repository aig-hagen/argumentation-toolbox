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
import type { AbstractArgumentation } from '@/modules/abstract-argumentation/model'
import {
  exportLatexArgumentationCommon,
  latexExportCommonConfig,
} from '@/modules/common/argumentation/export'
import type { ArgumentData, ArgumentId } from '@/modules/common/argumentation/model'
import { type ExportConfig, ExportFormatId, type ExportStyleOptions } from '@/modules/common/export'
import { IdMapping } from '@/modules/common/ids'

const exportICCMA: ExportConfig<AbstractArgumentation<ArgumentData>> = {
  id: ExportFormatId.Iccma,
  name: 'ICCMA',
  references: [
    { label: 'ICCMA 2025 Rules', url: 'https://argumentationcompetition.org/2025/rules.html' },
  ],
  extension: 'af',
  export(document) {
    let numberOfArguments = 0
    const idMapping = new IdMapping<ArgumentId, number>()
    for (const [argumentId] of document.arguments()) {
      // Tweety expects argument IDs to start with 1 and go up to n,
      // where n is the number of arguments.
      idMapping.add(argumentId, ++numberOfArguments)
    }
    let text = `p af ${numberOfArguments}\r\n`
    for (const [sourceId, targetId] of document.attacks()) {
      const sourceNumberId = idMapping.getOrFail(sourceId)
      const targetNumberId = idMapping.getOrFail(targetId)
      text += `${sourceNumberId} ${targetNumberId}\r\n`
    }
    text = text.trimEnd()
    return {
      text: text,
    }
  },
}

const exportTGF: ExportConfig<AbstractArgumentation<ArgumentData>> = {
  id: ExportFormatId.Tgf,
  name: 'Trivial Graph Format (TGF)',
  references: [{ label: 'TGF Format', url: 'https://en.wikipedia.org/wiki/Trivial_Graph_Format' }],
  extension: 'tgf',
  export(document) {
    let numberOfArguments = 0
    const idMapping = new IdMapping<ArgumentId, number>()
    for (const [argumentId] of document.arguments()) {
      idMapping.add(argumentId, ++numberOfArguments)
    }

    let text = ''
    for (const [argumentId] of document.arguments()) {
      text += `${idMapping.getOrFail(argumentId)}\r\n`
    }
    text += '#\r\n'
    for (const [sourceId, targetId] of document.attacks()) {
      const sourceNumberId = idMapping.getOrFail(sourceId)
      const targetNumberId = idMapping.getOrFail(targetId)
      text += `${sourceNumberId} ${targetNumberId}\r\n`
    }
    text = text.trimEnd()
    return {
      text,
    }
  },
}

const exportLatexAbsractArgumentation: ExportConfig<AbstractArgumentation<ArgumentData>> = {
  ...latexExportCommonConfig(),
  export(document, styleOptions?: ExportStyleOptions) {
    const args = document.arguments()
    const attacks = document.attacks()
    const supports = (function* () {})()
    return exportLatexArgumentationCommon(args, attacks, supports, styleOptions)
  },
}

export const availableExports = [exportLatexAbsractArgumentation, exportICCMA, exportTGF]
