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
  pageTitle: 'Datenschutz und Impressum',
  backToEditor: 'Zurück zum Editor',
  intro: {
    text: 'AgonProject erfasst schlanke, {emphasis} Nutzungsstatistiken, damit wir sehen können, welche Teile der App genutzt werden. Es gibt keine Cookies, keine personenbezogenen Daten und kein Tracking. Die Inhalte, die du in der App erstellst, werden niemals erfasst.',
    emphasis: 'anonyme, aggregierte',
  },
  collect: {
    title: 'Was wir erfassen',
    body: 'Wir erfassen einfache, anonyme Ereignisse — einen Seitenaufruf, das Öffnen eines Moduls oder einer Auswertung, das Erzeugen eines zufälligen Argumentationsgraphen, den Beginn oder Abschluss eines Tutorials oder das Erstellen eines Links zum Teilen. Jedes Ereignis speichert nur die Art der Aktion und höchstens ein nicht identifizierendes Detail wie das Modul oder den gewählten Erzeugungsalgorithmus — niemals die konkreten Inhalte oder den Inhalt eines geteilten Graphen.',
  },
  dont: {
    title: 'Was wir niemals erfassen',
    items: {
      ip: 'IP-Adressen',
      location: 'Genauer Standort',
      shareIds: 'Share-IDs oder andere Inhalte, die du in der App erstellst',
      other: 'Sonstige personenbezogene Daten',
    },
  },
  optOut: {
    title: 'Widerspruch',
    text: 'Wir respektieren {gpc} und die Einstellung {dnt}.',
    gpc: 'Global Privacy Control',
    dnt: 'Do Not Track',
  },
  imprint: {
    title: 'Impressum',
    responsible:
      'Verantwortlich gemäß § 5 DDG und § 18 Abs. 2 MStV: Lars Bengel ({email}), Universitätsstraße 11, 58097 Hagen, Deutschland.',
  },
}
