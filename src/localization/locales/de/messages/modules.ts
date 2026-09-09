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
import type { LocaleMessageSchema } from '@/localization/types'

const modules: LocaleMessageSchema['modules'] = {
  abstract: {
    name: 'Abstrakte Argumentation',
    description:
      'Das grundlegende Modell zur formalen Darstellung von Argumentation über Argumente und gerichtete Angriffe.',
  },
  bipolar: {
    name: 'Bipolare Argumentation',
    description: 'Relationen zwischen Argumenten können entweder angreifend oder unterstützend sein.',
  },
  incomplete: {
    name: 'Unvollständige Argumentation',
    description:
      'Unterscheidet zwischen sicheren und unsicheren Argumenten und Angriffen, um Unsicherheit qualitativ zu realisieren.',
  },
  probabilistic: {
    name: 'Probabilistische Argumentation',
    description:
      'Argumenten und Angriffen kann ein Wahrscheinlichkeitswert zwischen 0 und 1 zugewiesen werden, um Unsicherheit zu quantifizieren.',
  },
  dialectical: {
    name: 'Abstrakte Dialektische Graphen',
    description:
      'Relationen zwischen Argumenten werden über aussagenlogische Akzeptanzbedingungen modelliert.',
  },
  collectiveAttacks: {
    name: 'Argumentation mit Mengenangriffen',
    description:
      'Erweitert die abstrakte Argumentation, indem Mengen von Argumenten ein Zielargument gemeinsam angreifen können.',
  },
  tags: {
    abstract: {
      name: 'Abstrakt',
      description: 'Argumente sind abstrakte Entitäten ohne interne Struktur.',
    },
    augmented: {
      name: 'Angereichert',
      description:
        'Argumente werden mit zusätzlichen Informationen angereichert, etwa einer Konklusion oder Prämissen.',
    },
    uncertainty: {
      name: 'Unsicherheit',
      description:
        'Der Argumentationsgraph repräsentiert unvollständige Informationen oder Wahrscheinlichkeiten.',
    },
    attack: {
      name: 'Angriff',
      description: 'Der Argumentationsgraph modelliert Angriffsrelationen zwischen Argumenten.',
    },
    support: {
      name: 'Unterstützung',
      description: 'Der Argumentationsgraph modelliert Unterstützungsrelationen zwischen Argumenten.',
    },
    collectiveRelations: {
      name: 'Kollektive Relationen',
      description: 'Relationen können Mengen von Argumenten statt einzelner Argumente umfassen.',
    },
    constraints: {
      name: 'Einschränkungen',
      description:
        'Der Argumentationsgraph erlaubt zusätzliche Einschränkungen für die Akzeptanz von Argumenten.',
    },
    weights: {
      name: 'Gewichte',
      description:
        'Argumenten oder Relationen können Gewichte, Wahrscheinlichkeiten oder Werte zugewiesen werden.',
    },
  },
}

export default modules
