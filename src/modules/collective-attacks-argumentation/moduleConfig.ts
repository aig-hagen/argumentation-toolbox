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
import { datasets } from '@/modules/collective-attacks-argumentation/examples'
import GraphEditor from '@/modules/collective-attacks-argumentation/GraphEditor.vue'
import { SetAF, type SetAfArgumentData } from '@/modules/collective-attacks-argumentation/model'
import {
  canLoadFromObject,
  loadFromString,
  saveAsString,
} from '@/modules/collective-attacks-argumentation/save/saveFormat'
import { TAG_ABSTRACT, TAG_ATTACK, TAG_COLLECTIVE_RELATIONS } from '@/modules/common/tags'
import { BCDFP21, NP06 } from '@/modules/common/tooltip/publications'

const TYPE_KEY = 'type'
const SET_AF_V1_TYPE = 'set-af-v1'

const initialSetAF = new SetAF<SetAfArgumentData>()
initialSetAF.addArgument(0, { name: 'a', x: -150, y: -100 })
initialSetAF.addArgument(1, { name: 'b', x: -155, y: 67 })
initialSetAF.addArgument(2, { name: 'c', x: -30, y: -13 })
initialSetAF.addArgument(3, { name: 'd', x: -15, y: 122 })
initialSetAF.addCollectiveAttack([0, 1], 2)
initialSetAF.addCollectiveAttack([2, 3], 1)
initialSetAF.addCollectiveAttack([2], 0)

export const collectiveAttacksArgumentationModule: ModuleConfig<SetAF<SetAfArgumentData>> = {
  newNamePrefix: 'SetAF',
  id: 'collectiveAttacks',
  is(model: unknown) {
    return model instanceof SetAF
  },
  deserialize(modelSerialized: unknown): SetAF<SetAfArgumentData> | undefined {
    if (typeof modelSerialized !== 'object' || modelSerialized === null) return undefined
    // @ts-expect-error TS7053: ignore because we deserialize
    if (modelSerialized[TYPE_KEY] !== SET_AF_V1_TYPE) return undefined
    const af = new SetAF<SetAfArgumentData>()
    // @ts-expect-error TS7053: ignore because we deserialize
    const argsMap = modelSerialized['args'] as Record<string, SetAfArgumentData>
    for (const [id, data] of Object.entries(argsMap)) {
      af.addArgument(parseInt(id, 10), data)
    }
    // @ts-expect-error TS7053: ignore because we deserialize
    const attacks = modelSerialized['attacks'] as Array<{
      id: number
      attackers: number[]
      target: number
    }>
    for (const { attackers, target } of attacks) {
      af.addCollectiveAttack(attackers, target)
    }
    return af
  },
  serialize(model: Objectish) {
    if (!this.is(model)) return undefined
    const argsMap: Record<number, SetAfArgumentData> = {}
    for (const [id, data] of model.arguments()) {
      argsMap[id] = data
    }
    return {
      [TYPE_KEY]: SET_AF_V1_TYPE,
      args: argsMap,
      attacks: model.attacks(),
    }
  },
  examples: datasets,
  initialCotent: initialSetAF,
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
  generateHref: '/generate?type=setaf',
  publications: [NP06, BCDFP21],
  tags: [TAG_ABSTRACT, TAG_ATTACK, TAG_COLLECTIVE_RELATIONS],
}
