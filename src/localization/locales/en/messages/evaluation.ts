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
  noEvaluationYet: 'No evaluation yet.',
  addEvaluation: 'Add evaluation',
  removeEvaluation: 'Remove evaluation',
  collapseSheet: 'Collapse sheet',
  expandSheet: 'Expand sheet',
  closeSwitcher: 'Close switcher',
  kinds: {
    extension: 'Extension semantics',
    ranking: 'Ranking semantics',
    serialisation: 'Serialisation',
  },
  modes: {
    enumerate: 'Enumerate',
    credulous: 'Credulous',
    skeptical: 'Skeptical',
  },
  fields: {
    semantics: 'Semantics',
    mode: 'Mode',
    selection: 'Selection',
    termination: 'Termination',
  },
  metaSemantics: 'Meta Semantics',
  // Bipolar support-interpretation selector.
  support: {
    label: 'Support',
    coalition: 'Coalition',
    deductive: 'Deductive',
    necessary: 'Necessary',
  },
  // Plural nouns used by the copy footer and result grid.
  nouns: {
    results: 'results',
    extensions: 'extensions',
    ranking: 'ranking',
  },
  status: {
    copyPlain: 'Copy as plain text',
    copyTex: 'Copy as TeX',
    copied: 'Copied {noun} to clipboard',
    copiedTex: 'Copied {noun} to clipboard (LaTeX)',
    noResults: 'No results.',
    serviceUnavailable: 'Server temporarily unavailable — retrying may help',
    rateLimited: 'Too many requests — please wait a moment',
    timedOut: 'Timed out after {seconds}s',
    failed: 'Evaluation failed',
    retry: 'Retry',
    evaluating: 'Evaluating…',
    evaluatingCountdown: 'Evaluating… {seconds}s',
    hideParams: 'Hide',
    editParams: 'Edit',
  },
  extensionWindow: {
    selectExtensionHint: 'Select extension to highlight',
    selectArgumentHint: 'Select acceptable argument to highlight',
    noExtensions: 'No extensions exist.',
    noAcceptableArguments: 'No acceptable arguments exist.',
  },
  ranking: {
    modeLabel: 'Ranking',
    levelHint: 'Node labels show the ranking level',
    scoreHint: 'Node labels show ranking scores',
  },
  serialisation: {
    modeSequences: 'Sequences',
    modeInteractive: 'Interactive',
    timedOut: 'Evaluation timed out',
    noSequences: 'No serialisation sequences found.',
    sequenceCount: 'sequence | sequences',
    terminal: 'Terminal',
    notTerminal: 'Not terminal',
    noInitialSets: 'No initial sets available.',
    selectNextInitialSet: 'Select next initial set:',
    reset: 'Reset',
  },
}
