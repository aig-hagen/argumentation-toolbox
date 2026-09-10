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

import type { EvaluationKind } from '@/modules/common/evaluation/types'
import type { Example } from '@/modules/common/examples'
import type { EditorComponent } from '@/modules/common/graph-editor/graphEditor'
import type { DeserializationResult } from '@/modules/common/save/load'
import type { TagId } from '@/modules/common/tags'
import type { Publication } from '@/modules/common/tooltip/publications'

export type { Publication }

export interface ModuleConfig<DocumentT extends Objectish> {
  /**
   * A name that is used when creating new documents for this module
   * or saving documents that are unnamed.
   */
  newNamePrefix: string
  /**
   * Stable, language-independent module identifier. Localized display name/description live
   * in the `modules.<id>` message catalog; presentation code builds a {@link ModuleCard} from it.
   */
  id: string
  /**
   * Check if any given model can be handled by this module.
   * @param model model
   */
  is(model: Objectish): model is DocumentT
  /**
   * Deserializes a serialized model.
   * This is used for the internal serialization to IndexedDB.
   * @param modelSerialized model to be deserialized
   * @returns Returns the deserialized model, if it can be deserialized by this module
   */
  deserialize(modelSerialized: Objectish): DocumentT | undefined
  /**
   * Serializes a model
   * This is used for the internal serialization to IndexedDB.
   * @param model model to be serilized
   * @returns Returns the serialized model, if it can be serialized by this module
   */
  serialize(model: Objectish): Objectish | undefined
  /**
   * Example model for this modules.
   * The user can choose to open one of these examples.
   */
  examples: Example<DocumentT>[]
  /**
   * The content used, when the user creates a new model.
   */
  initialCotent: DocumentT
  /**
   * A Vue component that is used to
   * work with models associated with this module.
   */
  editorComponent: EditorComponent<DocumentT>
  /**
   * Evaluation windows this module offers on the graph editor. A shell reads this to
   * decide which evaluation entry points to render.
   */
  evaluationKinds: EvaluationKind[]
  /**
   * Check the loaded data object can be loaded to a model.
   * This is user import data previously saved to disk.
   * @param dataObject
   */
  canLoadFromObject(dataObject: Record<string, unknown>): boolean
  /**
   * Load data string as model.
   * This is user import data previously saved to disk.
   * @param dataObject
   */
  load(dataString: string, fileName: string): DeserializationResult<DocumentT>
  /**
   * Save model as data string.
   * This is used to save data to disk and to be loaded later.
   * @param dataObject
   */
  getSaveString(document: DocumentT, name: string): string
  /**
   * Optional route href shown as a "Generate" link in the welcome screen.
   */
  generateHref?: string
  /**
   * Relevant publications shown in a tooltip on the welcome screen card.
   */
  publications?: Publication[]
  /**
   * If true, the module card is shown as under construction and cannot be used.
   */
  underConstruction?: boolean
  /**
   * Stable tag IDs describing properties of this argumentation type, e.g. for filtering or
   * search. Labels are localized via the `modules.tags.<id>` catalog.
   */
  tags?: TagId[]
}
