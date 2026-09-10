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
export default {
  title: 'Generate random {name}',
  backToEditor: 'Back to editor',
  loadError: 'Could not load algorithms: {error}',
  algorithm: 'Algorithm',
  typeOptions: 'Type Options',
  fixSeed: 'Fix random seed',
  fixedSeed: 'Fixed seed',
  seedPlaceholder: 'Seed',
  generate: 'Generate',
  generating: 'Generating…',
  openInEditor: 'Open in editor',
  downloadIccma: 'Download ICCMA',
  downloadTgf: 'Download TGF',
  tooManyEdges: 'Too many edges to open in editor (maximum is {max})',
  lastGenerated: 'Last generated',
  counts: {
    arguments: 'argument | arguments',
    attacks: 'attack | attacks',
    supports: 'support | supports',
    links: 'link | links',
    collectiveAttacks: 'collective attack | collective attacks',
  },
  result: {
    generated: 'Generated {args} with {attacks}.',
    generatedBipolar: 'Generated {args} with {attacks} and {supports}.',
    generatedIncomplete:
      'Generated {args} ({uncertainArgs} uncertain) with {definite} definite and {uncertain} uncertain {attacks}.',
  },
  resultShort: {
    generated: '{args}, {attacks}.',
    generatedBipolar: '{args}, {attacks}, {supports}.',
    generatedIncomplete:
      '{args} ({uncertainArgs} uncertain), {definite} definite + {uncertain} uncertain {attacks}.',
  },
}
