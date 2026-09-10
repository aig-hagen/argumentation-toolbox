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
import common from '@/localization/locales/de/messages/common'
import editor from '@/localization/locales/de/messages/editor'
import errors from '@/localization/locales/de/messages/errors'
import evaluation from '@/localization/locales/de/messages/evaluation'
import exportMessages from '@/localization/locales/de/messages/export'
import generate from '@/localization/locales/de/messages/generate'
import glossary from '@/localization/locales/de/messages/glossary'
import help from '@/localization/locales/de/messages/help'
import home from '@/localization/locales/de/messages/home'
import menu from '@/localization/locales/de/messages/menu'
import modules from '@/localization/locales/de/messages/modules'
import settings from '@/localization/locales/de/messages/settings'
import share from '@/localization/locales/de/messages/share'
import thirdParty from '@/localization/locales/de/messages/thirdParty'
import windowMessages from '@/localization/locales/de/messages/window'
import type { LocaleMessageSchema } from '@/localization/types'

const messages: LocaleMessageSchema = {
  common,
  editor,
  errors,
  evaluation,
  export: exportMessages,
  generate,
  glossary,
  help,
  home,
  menu,
  modules,
  settings,
  share,
  thirdParty,
  window: windowMessages,
}

export default messages
