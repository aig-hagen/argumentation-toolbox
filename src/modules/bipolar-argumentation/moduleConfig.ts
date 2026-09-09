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
import { datasets } from '@/modules/bipolar-argumentation/examples'
import GraphEditor from '@/modules/bipolar-argumentation/GraphEditor.vue'
import { BipoloarArgumentation } from '@/modules/bipolar-argumentation/model'
import {
  canLoadFromObject,
  loadFromString,
  saveAsString,
} from '@/modules/bipolar-argumentation/save/saveFormat'
import type { ArgumentData } from '@/modules/common/argumentation/model'
import { DirectedGraph } from '@/modules/common/graph/graph'
import { TAG_ABSTRACT, TAG_ATTACK, TAG_SUPPORT } from '@/modules/common/tags'
import { CCL21, CL05, CL10 } from '@/modules/common/tooltip/publications'

const BIPOLAR_ARGUMENTATION_V1_TYPE = 'bipolar-argumentation-v1'
const TYPE_KEY = 'type'

const initialBipolarArgumentation = new BipoloarArgumentation<ArgumentData>()
initialBipolarArgumentation.addArgument(0, {
  name: 'a',
  x: 0,
  y: 0,
})
initialBipolarArgumentation.addArgument(1, {
  name: 'b',
  x: 0,
  y: 200,
})
initialBipolarArgumentation.addArgument(2, {
  name: 'c',
  x: 100,
  y: 100,
})
initialBipolarArgumentation.addAttack(0, 2)
initialBipolarArgumentation.addSupport(1, 2)

export const bipoloarArgumentationModule: ModuleConfig<BipoloarArgumentation<ArgumentData>> = {
  newNamePrefix: 'BAF',
  id: 'bipolar',
  is(model: unknown) {
    return model instanceof BipoloarArgumentation
  },
  deserialize(modelSerialized: unknown): BipoloarArgumentation<ArgumentData> | undefined {
    if (typeof modelSerialized !== 'object' || modelSerialized === null) {
      return undefined
    }
    // @ts-expect-error TS7053: ignore because we deserilize
    if (modelSerialized[TYPE_KEY] !== BIPOLAR_ARGUMENTATION_V1_TYPE) {
      return undefined
    }

    const content: BipoloarArgumentation<ArgumentData> = new BipoloarArgumentation(
      // @ts-expect-error TS7053: ignore because we deserilize
      new DirectedGraph(modelSerialized['g']['v'], modelSerialized['g']['e']),
    )

    return content
  },
  serialize(model: Objectish) {
    if (!this.is(model)) {
      return undefined
    }
    return {
      [TYPE_KEY]: BIPOLAR_ARGUMENTATION_V1_TYPE,
      // @ts-expect-error TS2341: intentional private access for serialization
      g: model.g,
    }
  },
  examples: datasets,
  initialCotent: initialBipolarArgumentation,
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
  generateHref: '/generate?type=bipolar',
  publications: [CL05, CL10, CCL21],
  tags: [TAG_ABSTRACT, TAG_ATTACK, TAG_SUPPORT],
}
