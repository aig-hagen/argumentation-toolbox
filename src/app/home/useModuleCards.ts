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
import { computed, type ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type { ModuleCard } from '@/app/home/moduleCard'
import type { ModuleConfig } from '@/app/home/moduleConfig'
import { tagDescriptionKey, tagLabelKey } from '@/modules/common/tags'

/**
 * Builds localized {@link ModuleCard} view models from the raw (markRaw'd) module configs.
 * Recomputes when the active locale changes so already-mounted pickers update in place.
 */
export function useModuleCards<DocumentT extends Objectish>(
  modules: ModuleConfig<DocumentT>[],
): ComputedRef<ModuleCard<DocumentT>[]> {
  const { t } = useI18n({ useScope: 'global' })

  return computed(() =>
    modules.map((module) => ({
      id: module.id,
      newNamePrefix: module.newNamePrefix,
      displayNameSingular: t(`modules.${module.id}.name`),
      description: t(`modules.${module.id}.description`),
      examples: module.examples,
      initialCotent: module.initialCotent,
      generateHref: module.generateHref,
      underConstruction: module.underConstruction,
      publications: module.publications,
      tags: (module.tags ?? []).map((id) => ({
        id,
        name: t(tagLabelKey(id)),
        description: t(tagDescriptionKey(id)),
      })),
    })),
  )
}
