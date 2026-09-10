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
  toolbar: {
    fitToView: 'Fit to view',
    evaluate: 'Evaluate',
    backToFrameworks: 'Back to frameworks',
    extensionSemantics: 'Extension Semantics',
    rankingSemantics: 'Ranking Semantics',
    serialisationSequences: 'Serialisation Sequences',
  },
  selection: {
    addToAttack: 'Add to attack',
    removeFromAttack: 'Remove from attack',
    switchTo: 'Switch to {type}',
    linkFallback: 'type',
  },
  certainty: {
    argumentType: 'Argument type',
    definiteArgument: 'Definite argument',
    uncertainArgument: 'Uncertain argument',
    markDefinite: 'Mark definite',
    markUncertain: 'Mark uncertain',
  },
  probabilities: {
    title: 'Probabilities',
    editProbability: 'Edit probability',
    arguments: 'Arguments',
    attacks: 'Attacks',
    empty: 'Add arguments to the graph to set their probabilities.',
  },
  condition: {
    title: 'Acceptance condition',
    titleOf: 'Acceptance condition of {name}',
    editCondition: 'Edit condition',
    syntaxError: 'Condition is syntactically incorrect and will not be saved',
    backspace: 'Backspace',
    hint: 'Tap the operator keys and argument chips to build the condition.',
    operators: 'Operators',
    arguments: 'Arguments',
    referenceEmpty: 'Add arguments to the graph to reference them here.',
    clearAll: 'Clear all',
    atom: 'Arg',
    noArguments: 'No arguments',
    keys: {
      negation: 'Negation',
      conjunction: 'Conjunction',
      disjunction: 'Disjunction',
      tautology: 'Tautology',
      contradiction: 'Contradiction',
      parentheses: 'Parentheses',
    },
  },
  links: {
    attack: 'Attack',
    support: 'Support',
    definiteAttack: 'Definite Attack',
    uncertainAttack: 'Uncertain Attack',
    collectiveAttack: 'Collective Attack',
    link: 'Link',
  },
  relayout: {
    other: 'Other',
    layouts: {
      TopToBottom: 'Top to bottom',
      BottomToTop: 'Bottom to top',
      LeftToRight: 'Left to right',
      RightToLeft: 'Right to left',
      ForceDirected: 'Force-directed',
      Neato: 'Spring model',
      Circular: 'Circular',
      Radial: 'Radial',
    },
  },
}
