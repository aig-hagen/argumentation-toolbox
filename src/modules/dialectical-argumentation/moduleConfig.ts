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
import type { Objectish } from 'immer'

import type { ModuleConfig } from '@/app/home/moduleConfig'
import { DirectedGraph } from '@/modules/common/graph/graph'
import {
  TAG_ABSTRACT,
  TAG_ATTACK,
  TAG_COLLECTIVE_RELATIONS,
  TAG_CONSTRAINTS,
  TAG_SUPPORT,
} from '@/modules/common/tags'
import { BESWW13, BESWW18, BW10 } from '@/modules/common/tooltip/publications'
import { datasets } from '@/modules/dialectical-argumentation/examples'
import GraphEditor from '@/modules/dialectical-argumentation/GraphEditor.vue'
import {
  type AdfArgumentData,
  DialecticalArgumentation,
} from '@/modules/dialectical-argumentation/model'
import {
  canLoadFromObject,
  loadFromString,
  saveAsString,
} from '@/modules/dialectical-argumentation/save/saveFormat'

const DIALECTICAL_ARGUMENTATION_V1_TYPE = 'dialectical-argumentation-v1'
const TYPE_KEY = 'type'

const initialDialecticalArgumentation = new DialecticalArgumentation<AdfArgumentData>()
initialDialecticalArgumentation.addArgument(0, {
  name: 'a',
  x: 0,
  y: 0,
  condition: { type: 'tautology' },
})
initialDialecticalArgumentation.addArgument(1, {
  name: 'b',
  x: 0,
  y: 200,
  condition: { type: 'contradiction' },
})
initialDialecticalArgumentation.addArgument(2, {
  name: 'c',
  x: 150,
  y: 100,
  condition: {
    type: 'disjunction',
    children: [
      { type: 'atom', argumentId: 0 },
      { type: 'negation', child: { type: 'atom', argumentId: 1 } },
    ],
  },
})
// Derive links from conditions
initialDialecticalArgumentation.setCondition(
  0,
  initialDialecticalArgumentation.getArgument(0).condition,
)
initialDialecticalArgumentation.setCondition(
  1,
  initialDialecticalArgumentation.getArgument(1).condition,
)
initialDialecticalArgumentation.setCondition(
  2,
  initialDialecticalArgumentation.getArgument(2).condition,
)

export const dialecticalArgumentationModule: ModuleConfig<
  DialecticalArgumentation<AdfArgumentData>
> = {
  newNamePrefix: 'ADF',
  id: 'dialectical',
  is(model: unknown) {
    return model instanceof DialecticalArgumentation
  },
  deserialize(modelSerialized: unknown): DialecticalArgumentation<AdfArgumentData> | undefined {
    if (typeof modelSerialized !== 'object' || modelSerialized === null) {
      return undefined
    }
    // @ts-expect-error TS7053: ignore because we deserialize
    if (modelSerialized[TYPE_KEY] !== DIALECTICAL_ARGUMENTATION_V1_TYPE) {
      return undefined
    }
    const content = new DialecticalArgumentation<AdfArgumentData>(
      // @ts-expect-error TS7053: intentional private access for deserialization
      new DirectedGraph(modelSerialized['g']['v'], modelSerialized['g']['e']),
    )
    return content
  },
  serialize(model: Objectish) {
    if (!this.is(model)) {
      return undefined
    }
    return {
      [TYPE_KEY]: DIALECTICAL_ARGUMENTATION_V1_TYPE,
      // @ts-expect-error TS2341: intentional private access for serialization
      g: model.g,
    }
  },
  examples: datasets,
  initialCotent: initialDialecticalArgumentation,
  editorComponent: GraphEditor,
  evaluationKinds: ['extension'],
  canLoadFromObject(dataObject: Record<string, unknown>): boolean {
    return canLoadFromObject(dataObject)
  },
  load(dataString, fileName) {
    return loadFromString(dataString, fileName)
  },
  getSaveString(document, name) {
    return saveAsString(document, name)
  },
  generateHref: '/generate?type=adf',
  publications: [BW10, BESWW13, BESWW18],
  tags: [TAG_ABSTRACT, TAG_ATTACK, TAG_SUPPORT, TAG_COLLECTIVE_RELATIONS, TAG_CONSTRAINTS],
}
