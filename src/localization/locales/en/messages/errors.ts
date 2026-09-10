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
  file: {
    loadFailedTitle: 'Failed loading',
    uploadFailed: 'Failed to upload file',
    notJson: 'Uploaded file is not JSON',
    unsupportedJson: 'Uploaded file contains unsupported JSON',
    loaded: 'Data loaded',
  },
  import: {
    jsonSyntax: 'The file "{fileName}" is not a valid JSON file: {detail}',
    schemaMismatch: 'Data does not match the expected schema: {detail}',
    invalidData: 'The file "{fileName}" contains invalid data: {detail}',
    validation: 'The file "{fileName}" contains invalid data:\n\n{detail}',
  },
  storage: {
    title: 'Could not save your data',
    description:
      'Your browser is blocking local storage, so some settings, window layouts, and progress may not be saved between visits. This can happen in private browsing or if storage is disabled.',
  },
  generate: {
    loadFailed: 'Failed to load algorithms',
    failed: 'Generation failed',
    timeout: 'Generation timed out after {seconds} s',
    rateLimited: 'Too many requests — please wait a moment before generating again',
    unavailable: 'The server is temporarily unavailable — please try again in a moment',
    httpStatus: 'HTTP {status}',
  },
}
