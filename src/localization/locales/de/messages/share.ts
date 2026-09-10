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
  title: 'Link teilen',
  description:
    'Jede Person mit diesem Link kann eine Kopie dieses Argumentationsgraphen in ihren Browser importieren.',
  copyLink: 'Link kopieren',
  copied: 'Kopiert!',
  actions: {
    createFailed: 'Link zum Teilen konnte nicht erstellt werden',
    linkCopied: 'Link zum Teilen in die Zwischenablage kopiert',
  },
  load: {
    goToEditor: 'Zum Editor',
    errors: {
      loadFailed: 'Geteilter Inhalt konnte nicht geladen werden',
      rateLimited: 'Zu viele Uploads — bitte warte einen Moment, bevor du es erneut versuchst',
      uploadFailed: 'Upload fehlgeschlagen ({status})',
      notFound: 'Link zum Teilen nicht gefunden oder abgelaufen',
      invalidData: 'Geteilter Inhalt enthält ungültige Daten',
      unsupportedData: 'Geteilter Inhalt enthält nicht unterstützte Daten',
      unsupportedType: 'Geteilter Inhalt enthält einen nicht unterstützten Graphtyp',
      parseFailed: 'Geteilter Argumentationsgraph konnte nicht verarbeitet werden',
    },
  },
}
