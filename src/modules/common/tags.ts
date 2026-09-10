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

/**
 * A stable, language-independent tag identifier. The localized label/description live in
 * the `modules.tags.<id>` message catalog; use {@link tagLabelKey}/{@link tagDescriptionKey}
 * to resolve them reactively.
 */
export const TagId = {
  Abstract: 'abstract',
  Augmented: 'augmented',
  Uncertainty: 'uncertainty',
  Attack: 'attack',
  Support: 'support',
  CollectiveRelations: 'collectiveRelations',
  Constraints: 'constraints',
  Weights: 'weights',
} as const

export type TagId = (typeof TagId)[keyof typeof TagId]

export const TAG_ABSTRACT = TagId.Abstract
export const TAG_AUGMENTED = TagId.Augmented
export const TAG_UNCERTAINTY = TagId.Uncertainty
export const TAG_ATTACK = TagId.Attack
export const TAG_SUPPORT = TagId.Support
export const TAG_COLLECTIVE_RELATIONS = TagId.CollectiveRelations
export const TAG_CONSTRAINTS = TagId.Constraints
export const TAG_WEIGHTS = TagId.Weights

export const allTagIds: TagId[] = [
  TagId.Abstract,
  TagId.Augmented,
  TagId.Uncertainty,
  TagId.Attack,
  TagId.Support,
  TagId.CollectiveRelations,
  TagId.Constraints,
  TagId.Weights,
]

export const tagLabelKey = (id: TagId) => `modules.tags.${id}.name`
export const tagDescriptionKey = (id: TagId) => `modules.tags.${id}.description`
