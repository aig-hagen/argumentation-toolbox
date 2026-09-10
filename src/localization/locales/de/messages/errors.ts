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
    loadFailedTitle: 'Laden fehlgeschlagen',
    uploadFailed: 'Datei konnte nicht hochgeladen werden',
    notJson: 'Die hochgeladene Datei ist kein JSON',
    unsupportedJson: 'Die hochgeladene Datei enthält nicht unterstütztes JSON',
    loaded: 'Daten geladen',
  },
  import: {
    jsonSyntax: 'Die Datei „{fileName}“ ist keine gültige JSON-Datei: {detail}',
    schemaMismatch: 'Die Daten entsprechen nicht dem erwarteten Schema: {detail}',
    invalidData: 'Die Datei „{fileName}“ enthält ungültige Daten: {detail}',
    validation: 'Die Datei „{fileName}“ enthält ungültige Daten:\n\n{detail}',
  },
  storage: {
    title: 'Deine Daten konnten nicht gespeichert werden',
    description:
      'Dein Browser blockiert den lokalen Speicher, daher werden einige Einstellungen, Fensterlayouts und Fortschritte zwischen Besuchen möglicherweise nicht gespeichert. Das kann im privaten Modus oder bei deaktiviertem Speicher passieren.',
  },
  generate: {
    loadFailed: 'Algorithmen konnten nicht geladen werden',
    failed: 'Erzeugung fehlgeschlagen',
    timeout: 'Zeitüberschreitung bei der Erzeugung nach {seconds} s',
    rateLimited: 'Zu viele Anfragen — bitte warte einen Moment, bevor du erneut erzeugst',
    unavailable: 'Der Server ist vorübergehend nicht erreichbar — bitte versuche es gleich erneut',
    httpStatus: 'HTTP {status}',
  },
}
