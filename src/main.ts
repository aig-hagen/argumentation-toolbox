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
import '@aig-hagen/graph-component/lib/graph-component.css'
import '@/style.css'
import '@/app/setup-immer'

import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { createApp, markRaw } from 'vue'

import App from '@/app/App.vue'
import router from '@/app/router'
import { installI18n, useLocale } from '@/localization'
import { abstractArgumentationModule } from '@/modules/abstract-argumentation/moduleConfig'
import { bipoloarArgumentationModule } from '@/modules/bipolar-argumentation/moduleConfig'
import { collectiveAttacksArgumentationModule } from '@/modules/collective-attacks-argumentation/moduleConfig'
import { openDocumentsDB } from '@/modules/common/documents/db'
import { applyPalette } from '@/modules/common/theme/applyPalette'
import { dialecticalArgumentationModule } from '@/modules/dialectical-argumentation/moduleConfig'
import { incompleteArgumentationModule } from '@/modules/incomplete-argumentation/moduleConfig'
import { probabilisticArgumentationModule } from '@/modules/probabilistic-argumentation/moduleConfig'

const PRODUCTION_DATABASE_DOCUMENTS_NAME = 'documents'
const db = await openDocumentsDB(PRODUCTION_DATABASE_DOCUMENTS_NAME)

// Resolve and load the locale before mounting so startup doesn't flash in English.
await useLocale().initLocale()

const modules = [
  abstractArgumentationModule,
  bipoloarArgumentationModule,
  dialecticalArgumentationModule,
  incompleteArgumentationModule,
  probabilisticArgumentationModule,
  collectiveAttacksArgumentationModule,
] as const

const app = createApp(App, {
  db: markRaw(db),
  modules: markRaw(modules),
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

app.use(VueQueryPlugin, { queryClient })
app.use(router)
installI18n(app)

applyPalette()

app.mount('#app')
