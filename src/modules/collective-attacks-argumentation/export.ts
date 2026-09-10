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
import type { SetAF, SetAfArgumentData } from '@/modules/collective-attacks-argumentation/model'
import {
  buildIccmaText,
  exportLatexArgumentationCommon,
  latexExportCommonConfig,
} from '@/modules/common/argumentation/export'
import { type ExportConfig, ExportFormatId, type ExportStyleOptions } from '@/modules/common/export'
import { IdMapping } from '@/modules/common/ids'

function* emptyIterator(): IterableIterator<[number, number]> {}

const exportLatexSetAF: ExportConfig<SetAF<SetAfArgumentData>> = {
  ...latexExportCommonConfig(),
  export(document, styleOptions?: ExportStyleOptions) {
    return exportLatexArgumentationCommon(
      document.arguments(),
      emptyIterator(),
      emptyIterator(),
      styleOptions,
      { setAttacks: document.attacks() },
    )
  },
}

const exportICCMA: ExportConfig<SetAF<SetAfArgumentData>> = {
  id: ExportFormatId.Iccma,
  name: 'ICCMA',
  references: [
    {
      label: 'ICCMA 2025 Rules (extended for SETAF)',
      url: 'https://argumentationcompetition.org/2025/rules.html',
    },
  ],
  extension: 'setaf',
  export(document) {
    let numberOfArguments = 0
    const idMapping = new IdMapping<number, number>()
    for (const [id] of document.arguments()) {
      idMapping.add(id, ++numberOfArguments)
    }

    function* lines(): IterableIterator<string> {
      for (const { attackers, target } of document.attacks()) {
        const attackerNumbers = attackers.map((id) => idMapping.getOrFail(id)).sort((a, b) => a - b)
        yield [...attackerNumbers, idMapping.getOrFail(target)].join(' ')
      }
    }

    return { text: buildIccmaText('setaf', numberOfArguments, lines()) }
  },
}

const exportTGFSetAF: ExportConfig<SetAF<SetAfArgumentData>> = {
  id: ExportFormatId.Tgf,
  name: 'Trivial Graph Format (TGF)',
  references: [{ label: 'TGF Format', url: 'https://en.wikipedia.org/wiki/Trivial_Graph_Format' }],
  extension: 'tgf',
  export(document) {
    let numberOfArguments = 0
    const idMapping = new IdMapping<number, number>()
    for (const [id] of document.arguments()) {
      idMapping.add(id, ++numberOfArguments)
    }

    let text = ''
    for (const [id] of document.arguments()) {
      text += `${idMapping.getOrFail(id)}\r\n`
    }
    text += '#\r\n'
    for (const { attackers, target } of document.attacks()) {
      const attackerNumbers = attackers.map((id) => idMapping.getOrFail(id)).sort((a, b) => a - b)
      text += `${[...attackerNumbers, idMapping.getOrFail(target)].join(' ')}\r\n`
    }
    text = text.trimEnd()
    return { text }
  },
}

export const availableExports = [exportLatexSetAF, exportICCMA, exportTGFSetAF]
