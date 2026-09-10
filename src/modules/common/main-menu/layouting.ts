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
import {
  ArrowLongDownIcon,
  ArrowLongLeftIcon,
  ArrowLongRightIcon,
  ArrowLongUpIcon,
  ArrowPathIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  SignalIcon,
} from '@heroicons/vue/24/outline'
import type { Component } from 'vue'

export const Layout = {
  TopToBottom: 'TopToBottom',
  BottomToTop: 'BottomToTop',
  LeftToRight: 'LeftToRight',
  RightToLeft: 'RightToLeft',
  ForceDirected: 'ForceDirected',
  Neato: 'Neato',
  Circular: 'Circular',
  Radial: 'Radial',
} as const

export type Layout = (typeof Layout)[keyof typeof Layout]
export interface LayoutData {
  icon: Component
}

/** Localized label for a layout; resolve reactively via `t(layoutLabelKey(layout))`. */
export const layoutLabelKey = (layout: Layout) => `editor.relayout.layouts.${layout}`

export const layoutDatas: Record<Layout, LayoutData> = {
  [Layout.TopToBottom]: { icon: ArrowLongDownIcon },
  [Layout.BottomToTop]: { icon: ArrowLongUpIcon },
  [Layout.LeftToRight]: { icon: ArrowLongLeftIcon },
  [Layout.RightToLeft]: { icon: ArrowLongRightIcon },
  [Layout.ForceDirected]: { icon: ArrowsPointingOutIcon },
  [Layout.Neato]: { icon: ArrowsPointingInIcon },
  [Layout.Circular]: { icon: ArrowPathIcon },
  [Layout.Radial]: { icon: SignalIcon },
}
