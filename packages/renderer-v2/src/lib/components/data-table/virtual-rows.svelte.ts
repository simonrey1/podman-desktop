/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import {
  elementScroll,
  observeElementOffset,
  observeElementRect,
  type VirtualItem,
  Virtualizer,
} from '@tanstack/virtual-core';
import { untrack } from 'svelte';

/** What the rows depend on: read in an effect, the virtualizer follows them. */
export interface VirtualRowsOptions {
  count: number;
  /** the element scrolling the rows (e.g. the viewport of the page), once known */
  scrollElement: HTMLElement | null;
  /** the distance from the top of the scrolling content to the first row (e.g. the header of the table) */
  scrollMargin: number;
  /** the height of a row: the rows have the same height, they are not measured one by one */
  rowHeight: number;
  overscan: number;
  getItemKey: (index: number) => string | number;
}

/**
 * The rows of a list to render, from the virtualizer of TanStack (virtual-core), with runes: its options follow the
 * ones given (in an effect, without depending on its own state), and its changes (a scroll, a resize) bump a version
 * read by the getters. Created in a component: it is mounted with it.
 */
export class VirtualRows {
  readonly #virtualizer: Virtualizer<HTMLElement, HTMLElement>;
  #version = $state(0);

  constructor(options: () => VirtualRowsOptions) {
    const toCore = (
      next: VirtualRowsOptions,
    ): ConstructorParameters<typeof Virtualizer<HTMLElement, HTMLElement>>[0] => ({
      count: next.count,
      getScrollElement: () => next.scrollElement,
      estimateSize: () => next.rowHeight,
      scrollMargin: next.scrollMargin,
      overscan: next.overscan,
      getItemKey: next.getItemKey,
      observeElementRect,
      observeElementOffset,
      scrollToFn: elementScroll,
      // a scroll or a resize changed the rows: read again by the getters
      onChange: (): void => {
        this.#version++;
      },
    });
    this.#virtualizer = new Virtualizer(toCore(untrack(options)));

    // the options follow the rows, the scroll element...: applied before the rows are rendered
    $effect.pre(() => {
      const next = toCore(options());
      untrack(() => {
        this.#virtualizer.setOptions(next);
        this.#virtualizer._willUpdate();
        this.#version++;
      });
    });
    // listens to the scroll and the size of the scroll element while mounted
    $effect(() => this.#virtualizer._didMount());
  }

  /** the rows to render: their index, their offset */
  get items(): VirtualItem[] {
    // reading the version subscribes to the changes of the virtualizer (it is never negative)
    return this.#version >= 0 ? this.#virtualizer.getVirtualItems() : [];
  }

  /** the height of all the rows */
  get totalSize(): number {
    return this.#version >= 0 ? this.#virtualizer.getTotalSize() : 0;
  }
}
