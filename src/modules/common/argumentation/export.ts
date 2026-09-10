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
import { type Extension } from '@codemirror/state'

import { ARGUMENT_RADIUS_IN_PX, type ArgumentData } from '@/modules/common/argumentation/model'
import { ExportFormatId, type ExportResult, type ExportStyleOptions } from '@/modules/common/export'

export function latexExportCommonConfig(): {
  id: ExportFormatId
  name: string
  codemirrorOptions?: {
    loadExtensions: () => Promise<Extension[]>
  }
  references: { label: string; url: string }[]
  extension: string
} {
  return {
    id: ExportFormatId.Latex,
    name: 'LaTeX (argumentation)',
    codemirrorOptions: {
      loadExtensions: () =>
        import('codemirror-lang-latex').then(({ latex }) => [
          latex({ linter: { checkMissingDocumentEnv: false } }),
        ]),
    },
    references: [{ label: 'CTAN Package', url: 'https://ctan.org/pkg/argumentation' }],
    extension: 'tex',
  }
}

/**
 * Builds ICCMA-style plain-text export output: a `p <type> <n>` problem line
 * followed by one line per relation/annotation. Only the AF format (`p af n`
 * with bare `<source> <target>` attack lines) is an official ICCMA format;
 * other types here are extensions of that style, using a leading qualifier
 * letter on a line only where it's needed to disambiguate from other line
 * kinds (mirroring how ICCMA's own ABA format uses `a`/`c`/`r`).
 */
export function buildIccmaText(
  type: string,
  numberOfArguments: number,
  lines: Iterable<string>,
): string {
  let text = `p ${type} ${numberOfArguments}\r\n`
  for (const line of lines) {
    text += `${line}\r\n`
  }
  return text.trimEnd()
}

interface NodeExportInfo {
  name: string
  x: number
  y: number
  latexId: number
}

export interface SetAttack {
  attackers: number[]
  target: number
}

export interface ExportHooks {
  argumentOptions?: (id: number) => string
  attackOptions?: (sourceId: number, targetId: number) => string
  attackSuffix?: (sourceId: number, targetId: number) => string
  argumentAnnotation?: (id: number) => string | undefined
  setAttacks?: Iterable<SetAttack>
}

function buildOpts(...parts: string[]): string {
  const joined = parts.filter(Boolean).join(',')
  return joined ? `[${joined}]` : ''
}

function absolutePlacement(
  nodeMap: Map<number, NodeExportInfo>,
  snapToGrid: boolean,
  argumentOptions?: (id: number) => string,
): string {
  let text = ''
  for (const [id, node] of nodeMap.entries()) {
    const x = snapToGrid ? Math.round(node.x).toFixed(1) : node.x.toFixed(2)
    const y = snapToGrid ? Math.round(node.y).toFixed(1) : node.y.toFixed(2)
    text += `  \\argument${buildOpts(argumentOptions?.(id) ?? '')}(a${node.latexId}){${node.name}} at (${x},${y})\r\n`
  }
  return text
}

function shortenNameToLetter(name: string): string {
  if (name.length <= 3) return name
  const match = name.match(/[a-zA-Z0-9]/)
  return match ? match[0] : name
}

function buildNodeMap(
  args: IterableIterator<[id: number, data: ArgumentData]>,
  styleOptions?: ExportStyleOptions,
): Map<number, NodeExportInfo> {
  const nodeDistance = styleOptions?.nodeDistance ?? 1.5
  const gridCellScale = styleOptions?.gridCellScale ?? 3
  const pixelsPerUnit = (2 * ARGUMENT_RADIUS_IN_PX * gridCellScale) / nodeDistance
  const shortenNames = styleOptions?.shortenNames ?? true
  const nodeMap = new Map<number, NodeExportInfo>()
  let latexCounter = 0
  for (const [argumentId, argumentData] of args) {
    const nameEscaped = argumentData.name.replace(/[^a-zA-Z0-9 ]/g, '')
    const displayName = shortenNames ? shortenNameToLetter(nameEscaped) : nameEscaped
    nodeMap.set(argumentId, {
      name: displayName,
      x: argumentData.x / pixelsPerUnit,
      y: (argumentData.y / pixelsPerUnit) * -1,
      latexId: ++latexCounter,
    })
  }
  return nodeMap
}

export function exportLatexArgumentationCommon(
  args: IterableIterator<[id: number, data: ArgumentData]>,
  attacks: IterableIterator<[attackerId: number, attackedId: number]>,
  supports: IterableIterator<[attackerId: number, attackedId: number]>,
  styleOptions?: ExportStyleOptions,
  hooks?: ExportHooks,
): ExportResult {
  const argumentStyle = styleOptions?.argumentStyle ?? 'colored'
  const nameStyle = styleOptions?.nameStyle ?? 'math'
  const attackStyle = styleOptions?.attackStyle ?? 'standard'
  const supportStyle = styleOptions?.supportStyle ?? 'double'

  const nodeMap = buildNodeMap(args, styleOptions)
  offsetNodesToOrigin(nodeMap)

  const getLatexId = (id: number) => nodeMap.get(id)!.latexId

  let text = '\\begin{af}\r\n'
  text += absolutePlacement(nodeMap, styleOptions?.snapToGrid ?? false, hooks?.argumentOptions)
  text += emitLinks(
    processLinks(attacks, supports),
    getLatexId,
    hooks?.attackOptions,
    hooks?.attackSuffix,
  )
  if (hooks?.setAttacks) {
    for (const { attackers, target } of hooks.setAttacks) {
      if (attackers.length === 1) {
        text += `  \\attack{a${getLatexId(attackers[0]!)}}{a${getLatexId(target)}}\r\n`
      } else {
        text += `  \\setattack{${attackers.map((id) => `a${getLatexId(id)}`).join(',')}}{a${getLatexId(target)}}\r\n`
      }
    }
  }
  text += emitAnnotations(nodeMap.keys(), getLatexId, hooks?.argumentAnnotation)
  text += `\\end{af}`

  const afOptions = `[argumentstyle=${argumentStyle},namestyle=${nameStyle},attackstyle=${attackStyle},supportstyle=${supportStyle}]`
  return {
    text,
    // Loaded on demand: rendering pulls in opentype.js (~240 kB), only needed for SVG preview.
    svg: async () => {
      const { renderSvg } = await import('@/modules/common/export/renderSvg')
      return renderSvg(text.replace('\\begin{af}', `\\begin{af}${afOptions}`))
    },
  }
}

interface ProcessedLink {
  type: ProcessedLinkType
  self: boolean
  reverseType: ProcessedLinkType
  sourceId: number
  targetId: number
}

enum ProcessedLinkType {
  None,
  Attack,
  Support,
}

function offsetNodesToOrigin(nodes: Map<number, NodeExportInfo>): void {
  if (nodes.size === 0) return
  const vals = [...nodes.values()]
  const minX = Math.min(...vals.map((n) => n.x))
  const minY = Math.min(...vals.map((n) => n.y))
  for (const node of vals) {
    node.x -= minX
    node.y -= minY
  }
}

function emitAnnotations(
  ids: IterableIterator<number>,
  getLatexId: (id: number) => number,
  argumentAnnotation?: (id: number) => string | undefined,
): string {
  if (!argumentAnnotation) return ''
  let text = ''
  for (const id of ids) {
    const annotation = argumentAnnotation(id)
    if (annotation !== undefined) {
      text += `  \\annotation{a${getLatexId(id)}}{${annotation}}\r\n`
    }
  }
  return text
}

function emitLinks(
  processedLinks: ProcessedLink[],
  getLatexId: (id: number) => number,
  attackOptions?: (sourceId: number, targetId: number) => string,
  attackSuffix?: (sourceId: number, targetId: number) => string,
): string {
  const a = (id: number) => `a${getLatexId(id)}`
  const attack = (s: number, t: number, ...extra: string[]) =>
    `  \\attack${buildOpts(attackOptions?.(s, t) ?? '', ...extra)}{${a(s)}}{${a(t)}}${attackSuffix?.(s, t) ?? ''}\r\n`
  const support = (s: number, t: number, ...extra: string[]) =>
    `  \\support${buildOpts(...extra)}{${a(s)}}{${a(t)}}\r\n`

  let text = ''
  for (const { type, self, reverseType, sourceId, targetId } of processedLinks) {
    if (self) {
      switch (type) {
        case ProcessedLinkType.None:
          break
        case ProcessedLinkType.Attack:
          text += `  \\selfattack${buildOpts(attackOptions?.(sourceId, targetId) ?? '')}{${a(sourceId)}}{${a(targetId)}}\r\n`
          break
        case ProcessedLinkType.Support:
          text += `  \\support[selfattack]{${a(sourceId)}}{${a(targetId)}}\r\n`
          break
      }
    } else if (type == ProcessedLinkType.Attack && reverseType === ProcessedLinkType.None) {
      text += attack(sourceId, targetId)
    } else if (type == ProcessedLinkType.Support && reverseType === ProcessedLinkType.None) {
      text += support(sourceId, targetId)
    } else if (type === ProcessedLinkType.None && reverseType == ProcessedLinkType.Attack) {
      text += attack(targetId, sourceId)
    } else if (type === ProcessedLinkType.None && reverseType == ProcessedLinkType.Support) {
      text += support(targetId, sourceId)
    } else if (type === ProcessedLinkType.Attack && reverseType == ProcessedLinkType.Attack) {
      const fwdOpts = attackOptions?.(sourceId, targetId) ?? ''
      const revOpts = attackOptions?.(targetId, sourceId) ?? ''
      if (fwdOpts || revOpts) {
        text += attack(sourceId, targetId)
        text += attack(targetId, sourceId)
      } else {
        text += `  \\dualattack{${a(sourceId)}}{${a(targetId)}}\r\n`
      }
    } else if (type === ProcessedLinkType.Attack && reverseType == ProcessedLinkType.Support) {
      text += attack(sourceId, targetId, 'bend right')
      text += support(targetId, sourceId, 'bend right')
    } else if (type === ProcessedLinkType.Support && reverseType == ProcessedLinkType.Attack) {
      text += support(sourceId, targetId, 'bend right')
      text += attack(targetId, sourceId, 'bend right')
    } else if (type === ProcessedLinkType.Support && reverseType == ProcessedLinkType.Support) {
      text += support(sourceId, targetId, 'bend right')
      text += support(targetId, sourceId, 'bend right')
    }
  }
  return text
}

function processLinks(
  attacks: IterableIterator<[attackerId: number, attackedId: number]>,
  supports: IterableIterator<[attackerId: number, attackedId: number]>,
): ProcessedLink[] {
  const linksProcessed = new Map<string, ProcessedLink>()

  function processLinkType(
    links: IterableIterator<[sourceId: number, targetId: number]>,
    linkType: ProcessedLinkType,
  ) {
    for (const [sourceId, targetId] of links) {
      const key = sourceId < targetId ? sourceId + '|' + targetId : targetId + '|' + sourceId
      const link = linksProcessed.get(key)
      if (link === undefined) {
        let newLink
        if (sourceId === targetId) {
          newLink = {
            type: linkType,
            self: true,
            reverseType: ProcessedLinkType.None,
            sourceId: sourceId,
            targetId: targetId,
          }
        } else if (sourceId < targetId) {
          newLink = {
            type: linkType,
            self: false,
            reverseType: ProcessedLinkType.None,
            sourceId: sourceId,
            targetId: targetId,
          }
        } else {
          newLink = {
            type: ProcessedLinkType.None,
            self: false,
            reverseType: linkType,
            sourceId: targetId,
            targetId: sourceId,
          }
        }
        linksProcessed.set(key, newLink)
        continue
      }
      if (!link.self) {
        if (sourceId < targetId) {
          link.type = linkType
        } else {
          link.reverseType = linkType
        }
      }
    }
  }
  processLinkType(attacks, ProcessedLinkType.Attack)
  processLinkType(supports, ProcessedLinkType.Support)
  return [...linksProcessed.values()]
}
