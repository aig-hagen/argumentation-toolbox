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
  howToEdit: 'Bedienung',
  links: {
    source: 'Quelltext {tree}',
    thirdParty: 'Drittanbieter',
    privacy: 'Datenschutz und Impressum',
  },
  keys: {
    leftClick: 'Linksklick',
    leftDoubleClick: 'Doppelklick',
    rightClick: 'Rechtsklick',
    middleClick: 'Mittelklick',
    scrollWheel: 'Scrollrad',
  },
  controls: {
    action: 'Aktion',
    control: 'Steuerung',
    sections: {
      argumentsAttacks: 'Argumente & Angriffe',
      navigation: 'Navigation',
      general: 'Allgemein',
    },
    listAnd: 'und',
    createArgument: 'Argument erstellen',
    moveArgument: 'Argument verschieben',
    deleteArgument: 'Argument löschen',
    createLink: '{links} erstellen',
    createCollectiveAttack: 'Kollektiven Angriff erstellen',
    switchLink: 'Zwischen {links} wechseln',
    deleteLink: '{links} löschen',
    pan: 'Verschieben',
    zoom: 'Vergrößern/Verkleinern',
    centerView: 'Ansicht zentrieren',
    toggleGrid: 'Raster umschalten',
    togglePhysics: 'Physik umschalten',
    createArgumentControl: '{key} auf die Arbeitsfläche',
    moveArgumentControl: '{key} auf ein Argument, halten und ziehen',
    deleteArgumentControl: '{key} auf ein Argument und halten',
    createLinkControl: '{key} auf ein Argument, halten und zu einem Argument ziehen',
    createCollectiveAttackControl:
      '{shift}+{leftClick} auf 2 oder mehr Argumente, um Quellen auszuwählen, dann {rightClick} auf eine ausgewählte Quelle, halten und zum Zielargument ziehen',
    switchLinkControl: '{key} auf {links} und neuen Typ wählen',
    deleteLinkControl: '{key} auf {links} und halten',
    panControl: '{key} auf die Arbeitsfläche, halten und ziehen',
    zoomControl: '{key} auf der Arbeitsfläche',
    centerViewControl: '{key} auf die Arbeitsfläche',
  },
  gestures: {
    defaultTapAction: 'Umbenennen',
    doubleTapCanvas: {
      title: 'Doppeltippen auf die Arbeitsfläche',
      desc: 'Neues Argument hinzufügen',
    },
    tapArgument: {
      title: 'Argument antippen',
      desc: 'Öffne seine Aktionsleiste — {action}, löschen und mehr',
    },
    holdDrag: {
      title: 'Halten + zu einem anderen Argument ziehen',
      desc: '{links} dazwischen erstellen',
    },
    addToAttack: {
      title: 'Zum Angriff hinzufügen',
      desc: 'Tippe ein Argument an und wähle „Zum Angriff hinzufügen“ — oder halte es gedrückt — um eine Quellenmenge aufzubauen, dann halten + von einer hervorgehobenen Quelle zum Ziel ziehen',
    },
    selector: {
      title: 'Auswahl unten links',
      desc: 'Wähle, welche {links} du als Nächstes erstellst',
    },
    tapLink: {
      title: '{links} antippen',
      desc: 'Öffne seine Aktionsleiste, um den Typ zu wechseln oder es zu löschen — oder halte gedrückt, um zu löschen',
    },
    longPressLink: {
      title: '{links} gedrückt halten',
      desc: 'Löschen — oder antippen und die Aktionsleiste verwenden',
    },
    drag: {
      title: 'Mit einem Finger ziehen',
      desc: 'Arbeitsfläche verschieben — zum Zoomen zwei Finger',
    },
    fitView: {
      title: 'Ansicht-anpassen-Schaltfläche',
      desc: 'Ansicht neu zentrieren',
    },
    relayout: {
      title: 'Neu-anordnen-Schaltfläche',
      desc: 'Graph automatisch anordnen',
    },
  },
}
