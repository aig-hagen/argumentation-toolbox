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
  title: 'Share Link',
  description: 'Anyone with this link can import a copy of this framework into their browser.',
  copyLink: 'Copy link',
  copied: 'Copied!',
  actions: {
    createFailed: 'Failed to create share link',
    linkCopied: 'Share link copied to clipboard',
  },
  load: {
    goToEditor: 'Go to editor',
    errors: {
      loadFailed: 'Failed to load share',
      rateLimited: 'Too many uploads — please wait a moment before trying again',
      uploadFailed: 'Upload failed ({status})',
      notFound: 'Share link not found or expired',
      invalidData: 'Share contains invalid data',
      unsupportedData: 'Share contains unsupported data',
      unsupportedType: 'Share contains an unsupported framework type',
      parseFailed: 'Failed to parse shared framework',
    },
  },
}
