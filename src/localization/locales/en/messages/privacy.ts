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
  pageTitle: 'Privacy Policy and Imprint',
  backToEditor: 'Back to editor',
  intro: {
    text: 'AgonProject collects lightweight, {emphasis} usage statistics so we can see which parts of the app get used. There are no cookies, no personal data, and no tracking. The content of anything you build in the app is never collected.',
    emphasis: 'anonymous, aggregated',
  },
  collect: {
    title: 'What we collect',
    body: "We record simple, anonymous events — a page view, opening a module or an evaluation, generating a random framework, starting or finishing a tutorial, or creating a share link. Each event stores only the type of action and, at most, a non-identifying detail like the module or the chosen generation algorithm — never the specific content or the share's contents.",
  },
  dont: {
    title: 'What we never collect',
    items: {
      ip: 'IP addresses',
      location: 'Precise location',
      shareIds: 'Share IDs or any other content you create in the app',
      other: 'Any other personal data',
    },
  },
  optOut: {
    title: 'Opting out',
    text: 'We honour {gpc} and the {dnt} setting.',
    gpc: 'Global Privacy Control',
    dnt: 'Do Not Track',
  },
  imprint: {
    title: 'Imprint',
    responsible:
      'Responsible according to § 5 DDG and § 18 (2) MStV: Lars Bengel ({email}), Universitätsstraße 11, 58097 Hagen, Germany.',
  },
}
