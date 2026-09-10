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
  howToEdit: 'How to edit',
  links: {
    source: 'Source {tree}',
    thirdParty: 'Third-Party',
    privacy: 'Privacy Policy and Imprint',
  },
  keys: {
    leftClick: 'Left-click',
    leftDoubleClick: 'Left double-click',
    rightClick: 'Right-click',
    middleClick: 'Middle-click',
    scrollWheel: 'Scroll wheel',
  },
  controls: {
    action: 'Action',
    control: 'Control',
    sections: {
      argumentsAttacks: 'Arguments & Attacks',
      navigation: 'Navigation',
      general: 'General',
    },
    listAnd: 'and',
    createArgument: 'Create argument',
    moveArgument: 'Move argument',
    deleteArgument: 'Delete argument',
    createLink: 'Create {links}',
    createCollectiveAttack: 'Create collective attack',
    switchLink: 'Switch between {links}',
    deleteLink: 'Delete {links}',
    pan: 'Pan',
    zoom: 'Zoom in/out',
    centerView: 'Center view',
    toggleGrid: 'Toggle grid',
    togglePhysics: 'Toggle physics',
    createArgumentControl: '{key} on canvas',
    moveArgumentControl: '{key} on argument, hold and drag',
    deleteArgumentControl: '{key} on argument and hold',
    createLinkControl: '{key} on argument, hold and drag towards argument',
    createCollectiveAttackControl:
      '{shift}+{leftClick} on 2 or more arguments to select sources, then {rightClick} on a selected source, hold and drag towards the target argument',
    switchLinkControl: '{key} on {links} and select new type',
    deleteLinkControl: '{key} on {links} and hold',
    panControl: '{key} on canvas, hold and drag',
    zoomControl: '{key} on canvas',
    centerViewControl: '{key} on canvas',
  },
  gestures: {
    defaultTapAction: 'Rename it',
    doubleTapCanvas: {
      title: 'Double-tap the canvas',
      desc: 'Add a new argument',
    },
    tapArgument: {
      title: 'Tap an argument',
      desc: 'Open its action bar — {action}, delete and more',
    },
    holdDrag: {
      title: 'Hold + drag to another argument',
      desc: 'Create a {links} between them',
    },
    addToAttack: {
      title: 'Add to attack',
      desc: 'Tap an argument and choose "Add to attack" — or long-press it — to build a source set, then hold + drag from a highlighted source to the target',
    },
    selector: {
      title: 'Bottom-left selector',
      desc: 'Pick which {links} you create next',
    },
    tapLink: {
      title: 'Tap a {links}',
      desc: 'Open its action bar to switch type or delete it — or long-press to delete',
    },
    longPressLink: {
      title: 'Long-press a {links}',
      desc: 'Delete it — or tap it and use the action bar',
    },
    drag: {
      title: 'Drag with one finger',
      desc: 'Pan the canvas — pinch to zoom',
    },
    fitView: {
      title: 'Fit-view button',
      desc: 'Recenter the view',
    },
    relayout: {
      title: 'Relayout button',
      desc: 'Auto-arrange the graph',
    },
  },
}
