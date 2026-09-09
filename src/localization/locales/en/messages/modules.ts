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
  abstract: {
    name: 'Abstract Argumentation',
    description:
      'The foundational model for the formal representation of argumentation via arguments and directed attacks.',
  },
  bipolar: {
    name: 'Bipolar Argumentation',
    description: 'Relations between arguments can be either attacking or supporting.',
  },
  incomplete: {
    name: 'Incomplete Argumentation',
    description:
      'Distinguish between certain and uncertain arguments and attacks to represent incomplete information.',
  },
  probabilistic: {
    name: 'Probabilistic Argumentation',
    description:
      'Arguments and attacks can be assigned a probability value between 0 and 1 to quantify uncertainty.',
  },
  dialectical: {
    name: 'Dialectical Argumentation',
    description: 'Relations between arguments are modelled via propositional acceptance conditions.',
  },
  collectiveAttacks: {
    name: 'Argumentation with Collective Attacks',
    description:
      'Extends abstract argumentation by allowing sets of arguments to collectively attack a target argument.',
  },
  tags: {
    abstract: {
      name: 'Abstract',
      description: 'Arguments are abstract entities without internal structure.',
    },
    augmented: {
      name: 'Augmented',
      description:
        'Arguments are augmented with additional information, such as a claim or premises.',
    },
    uncertainty: {
      name: 'Uncertainty',
      description: 'The framework represents incomplete information or probabilities.',
    },
    attack: {
      name: 'Attack',
      description: 'The framework models attack relations between arguments.',
    },
    support: {
      name: 'Support',
      description: 'The framework models support relations between arguments.',
    },
    collectiveRelations: {
      name: 'Collective Relations',
      description: 'Relations can involve sets of arguments rather than single arguments.',
    },
    constraints: {
      name: 'Constraints',
      description: 'The framework allows for additional constraints on the acceptance of arguments.',
    },
    weights: {
      name: 'Weights',
      description: 'Arguments or relations can be assigned weights, probabilities, or values.',
    },
  },
}
