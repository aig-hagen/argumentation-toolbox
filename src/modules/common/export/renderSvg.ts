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
import { QueryClient } from '@tanstack/vue-query'
import { Font, parse as parseOpentypeFont, type PathCommand } from 'opentype.js'

const RENDER_SVG_CONTAINER_ID = 'render-svg-container'
const RENDER_SVG_CONTAINER = document.getElementById(RENDER_SVG_CONTAINER_ID)
if (RENDER_SVG_CONTAINER === null) {
  throw new Error('Could not find rendering container.')
}
const RESOLVE_SVG_FUNCTION_NAME = 'resolveSvg'

interface Wawoff2Module {
  decompress(x: Uint8Array<ArrayBuffer>): number
}

declare global {
  interface Window {
    Module?: Wawoff2Module
  }
}

// `wawoff2` needs to be loaded differently then other modules.
// See https://github.com/opentypejs/opentype.js#loading-a-woffotfttf-font
// We need to load wawoff2 if needed and also wait for it to be ready.
let wawoff2Promise: Promise<Wawoff2Module>
if (!window.Module) {
  wawoff2Promise = new Promise<Wawoff2Module>((resolve) => {
    // @ts-expect-error `onRuntimeInitialized` is part of the unconventional loading mechanism.
    window.Module = { onRuntimeInitialized: () => resolve(window.Module) }
    const script = document.createElement('script')
    script.src = 'node_modules/wawoff2/build/decompress_binding.js'
    document.body.append(script)
  })
} else {
  wawoff2Promise = Promise.resolve(window.Module as Wawoff2Module)
}

async function decompressWoff2Font(fontData: ArrayBuffer) {
  const wawoff2 = await wawoff2Promise
  return await wawoff2.decompress(new Uint8Array(fontData))
}

const fontQueryCleint = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: Infinity,
    },
  },
})

async function queryFont(fontFamily: string): Promise<Font> {
  const fontData = await fetch(`/node_modules/@drgrice1/tikzjax/dist/fonts/${fontFamily}.woff2`)
  if (!fontData.ok) {
    throw Error('Could not load font family: ' + fontFamily)
  }
  const fontDataArrayBuffer = await fontData.arrayBuffer()
  const fontDataDecomporessed = await decompressWoff2Font(fontDataArrayBuffer)
  return await parseOpentypeFont(fontDataDecomporessed)
}

async function queryFontCached(fontFamily: string) {
  return await fontQueryCleint.fetchQuery({
    queryKey: [fontFamily],
    queryFn: () => queryFont(fontFamily),
  })
}

RENDER_SVG_CONTAINER.style.display = 'none'
RENDER_SVG_CONTAINER.addEventListener('tikzjax-load-finished', async (event) => {
  const readySvg = event.target
  if (readySvg === null) {
    throw new Error('No event target.')
  }
  if (!(readySvg instanceof SVGSVGElement)) {
    throw new Error('Target not a top-level SVG Element.')
  }
  const scriptWrapper = readySvg.parentElement as (HTMLElement & Record<string, unknown>) | null
  if (scriptWrapper === null) {
    throw new Error('No script wrapper.')
  }
  if (!(typeof scriptWrapper[RESOLVE_SVG_FUNCTION_NAME] === 'function')) {
    throw new Error('Unexpected script wrapper encountered.')
  }
  const svgText = await processSvg(readySvg)
  scriptWrapper[RESOLVE_SVG_FUNCTION_NAME](svgText)
  scriptWrapper.remove()
})

// opentype.js's own Path#toPathData/toDOMElement decide whether to insert a separating
// space between numbers based on the sign of the *unrounded* value. A value that's a small
// negative number (e.g. -0.001) rounds to "0" (no sign), so it can end up concatenated onto
// the previous number with no separator at all (e.g. "-44.57" + "0" -> "-44.570"), producing
// an invalid `d` attribute. Serialize commands ourselves with unambiguous, always-present
// separators to sidestep that bug.
function pathDataFromCommands(commands: PathCommand[], decimalPlaces: number): string {
  let d = ''
  for (const cmd of commands) {
    const format = (v: number) => v.toFixed(decimalPlaces)
    switch (cmd.type) {
      case 'M':
        d += `M${format(cmd.x)} ${format(cmd.y)}`
        break
      case 'L':
        d += `L${format(cmd.x)} ${format(cmd.y)}`
        break
      case 'C':
        d += `C${format(cmd.x1)} ${format(cmd.y1)} ${format(cmd.x2)} ${format(cmd.y2)} ${format(cmd.x)} ${format(cmd.y)}`
        break
      case 'Q':
        d += `Q${format(cmd.x1)} ${format(cmd.y1)} ${format(cmd.x)} ${format(cmd.y)}`
        break
      case 'Z':
        d += 'Z'
        break
    }
  }
  return d
}

async function processSvg(unprocessedSvg: SVGSVGElement): Promise<string> {
  const texts = [...unprocessedSvg.getElementsByTagName('text')]
  for (const text of texts) {
    const fontFamily = text.getAttribute('font-family')
    if (fontFamily === null) {
      throw new Error('Font family not set.')
    }
    const fontSizeText = text.getAttribute('font-size')
    if (fontSizeText === null) {
      throw new Error('Font size not set.')
    }
    const fontSize = parseInt(fontSizeText, 10)
    const xText = text.getAttribute('x')
    if (xText === null) {
      throw new Error('X not set.')
    }
    const x = parseFloat(xText)
    const yText = text.getAttribute('y')
    if (yText === null) {
      throw new Error('Y not set.')
    }
    const y = parseFloat(yText)
    const font = await queryFontCached(fontFamily)
    const textPath = font.getPath(text.textContent, x, y, fontSize)
    const textPathSvg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    textPathSvg.setAttribute('d', pathDataFromCommands(textPath.commands, 2))
    text.replaceWith(textPathSvg)
  }
  const serializer = new XMLSerializer()
  return serializer.serializeToString(unprocessedSvg)
}

const TIKZJAX_SRC = '/node_modules/@drgrice1/tikzjax/dist/tikzjax.js'

// tikzjax boots a web worker that pulls a few MB of wasm/dump, so we load it
// only on the first export instead of on every page load.
let tikzjaxPromise: Promise<void> | undefined
function ensureTikzjaxLoaded(): Promise<void> {
  tikzjaxPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TIKZJAX_SRC
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('Failed to load tikzjax.')))
    document.body.append(script)
  })
  return tikzjaxPromise
}

export async function renderSvg(latex: string): Promise<string> {
  if (RENDER_SVG_CONTAINER === null) {
    throw new Error('Could not find rendering container.')
  }
  await ensureTikzjaxLoaded()
  const scriptWrapper = document.createElement('div')
  const script = document.createElement('script')
  script.type = 'text/tikz'
  // script.dataset.disableCache = 'true'
  script.dataset.showConsole = 'true'
  script.dataset.texPackages = JSON.stringify({ argumentation: '' })
  script.text = latex
  scriptWrapper.append(script)
  const svg = await new Promise<string>((resolve) => {
    ;(scriptWrapper as unknown as Record<string, unknown>).resolveSvg = resolve
    RENDER_SVG_CONTAINER.append(scriptWrapper)
  })

  return Promise.resolve(svg)
}
