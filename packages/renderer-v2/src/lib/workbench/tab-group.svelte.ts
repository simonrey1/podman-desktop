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

import { viewDefinition, viewKey, type ViewRef, viewState } from '#lib/views/index.js';

export interface Tab {
  /** the key of its view, and of its instance for the views opened several times */
  key: string;
  ref: ViewRef;
  /** 1 for the first instance of a view, 2 for the second one... (see `instances` in `defineView`) */
  instance: number;
  /** a preview tab (italic) is replaced by the next view opened as a preview, until it is pinned */
  preview: boolean;
  /** the state of the view in this tab (validated by the schema of the view, with its defaults) */
  state: Record<string, unknown>;
}

export interface TabGroupOptions {
  /** a first tab that cannot be closed, e.g. the Dashboard */
  fixed?: ViewRef;
  /** called when a tab becomes active */
  onActivate?: (tab: Tab) => void;
  /** called when the last tab is closed */
  onEmpty?: () => void;
}

/**
 * A group of tabs: opening a view focuses its tab, or opens a new tab next to the active one.
 * A view opened as a preview (single click) replaces the current preview tab. The editor and the panel are
 * tab groups; more groups (split editors, side panels) are more instances.
 */
export class TabGroup {
  tabs: Tab[] = $state([]);
  activeKey: string | undefined = $state();
  readonly active: Tab | undefined = $derived(this.tabs.find(tab => tab.key === this.activeKey));

  readonly #fixedKey: string | undefined;
  readonly #options: TabGroupOptions;

  constructor(options: TabGroupOptions = {}) {
    this.#options = options;
    if (options.fixed) {
      this.#fixedKey = viewKey(options.fixed);
      this.tabs.push({
        key: this.#fixedKey,
        ref: options.fixed,
        instance: 1,
        preview: false,
        state: viewState(options.fixed),
      });
      this.activeKey = this.#fixedKey;
    }
  }

  isClosable(key: string): boolean {
    return key !== this.#fixedKey;
  }

  /** @param options.state a part of the state of the view, e.g. the section to show (in a new or an existing tab) */
  open(ref: ViewRef, options: { preview?: boolean; state?: Record<string, unknown> } = {}): void {
    const preview = options.preview ?? false;
    const { key, instance } = this.#instanceOf(ref);
    const existing = this.tabs.find(tab => tab.key === key);
    if (existing) {
      if (!preview) {
        existing.preview = false;
      }
      if (options.state) {
        Object.assign(existing.state, viewState(ref, { ...$state.snapshot(existing.state), ...options.state }));
      }
    } else {
      const tab: Tab = { key, ref, instance, preview, state: viewState(ref, options.state) };
      const previewIndex = preview ? this.tabs.findIndex(tab => tab.preview) : -1;
      if (previewIndex >= 0) {
        this.tabs[previewIndex] = tab;
      } else {
        const activeIndex = this.tabs.findIndex(tab => tab.key === this.activeKey);
        this.tabs.splice(activeIndex < 0 ? this.tabs.length : activeIndex + 1, 0, tab);
      }
    }
    this.activate(key);
  }

  /** the key and the number of the instance to show: the view itself, or a new instance of a view opened several times */
  #instanceOf(ref: ViewRef): { key: string; instance: number } {
    const viewId = viewKey(ref);
    if (viewDefinition(ref.view).instances !== 'multiple') {
      return { key: viewId, instance: 1 };
    }
    const instances = this.tabs.filter(tab => viewKey(tab.ref) === viewId).map(tab => tab.instance);
    const next = instances.length ? Math.max(...instances) + 1 : 1;
    return { key: `${viewId}#${next}`, instance: next };
  }

  activate(key: string): void {
    const tab = this.tabs.find(tab => tab.key === key);
    if (tab) {
      this.activeKey = key;
      this.#options.onActivate?.(tab);
    }
  }

  /** keeps the tab open: it is not replaced by the next preview anymore */
  pin(key: string): void {
    const tab = this.tabs.find(tab => tab.key === key);
    if (tab) {
      tab.preview = false;
    }
  }

  close(key: string): void {
    this.closeWhere(tab => tab.key === key);
  }

  closeOthers(key: string): void {
    this.closeWhere(tab => tab.key !== key);
  }

  closeToTheRight(key: string): void {
    const index = this.tabs.findIndex(tab => tab.key === key);
    this.closeWhere((_tab, tabIndex) => tabIndex > index);
  }

  closeAll(): void {
    this.closeWhere(() => true);
  }

  closeWhere(predicate: (tab: Tab, index: number) => boolean): void {
    const kept = this.tabs.filter((tab, index) => !this.isClosable(tab.key) || !predicate(tab, index));
    if (kept.length === this.tabs.length) {
      return;
    }
    const activeIndex = this.tabs.findIndex(tab => tab.key === this.activeKey);
    const next = kept.some(tab => tab.key === this.activeKey)
      ? this.active
      : // the tab on the right of the closed active tab becomes active, else the one on its left
        (this.tabs.slice(activeIndex + 1).find(tab => kept.includes(tab)) ??
        this.tabs
          .slice(0, activeIndex)
          .reverse()
          .find(tab => kept.includes(tab)));
    this.tabs = kept;
    if (next) {
      this.activate(next.key);
    } else {
      this.activeKey = undefined;
      this.#options.onEmpty?.();
    }
  }
}
