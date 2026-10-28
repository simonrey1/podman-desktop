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

import { parseViewRef, viewDefinition, type ViewRef, viewRef } from '#lib/views/index.js';

import { type Tab, TabGroup } from './tab-group.svelte.js';

/**
 * The workbench: the tab groups showing the views. Today an editor group and a panel group; each view
 * opens in the group of its location. Moving a tab to another group only moves its view reference.
 */
export class Workbench {
  readonly editor: TabGroup;
  readonly panel: TabGroup;
  panelVisible = $state(false);

  constructor(options: { onActivate?: (ref: ViewRef) => void } = {}) {
    this.editor = new TabGroup({
      fixed: viewRef('dashboard', {}),
      onActivate: (tab): void => options.onActivate?.(tab.ref),
    });
    // closing the last session hides the panel
    this.panel = new TabGroup({ onEmpty: (): boolean => (this.panelVisible = false) });
  }

  /**
   * Opens a view in the group of its location.
   * @param options.preview opens it as a preview tab (single click), replacing the current preview tab
   * @param options.from what opens it: opening a view from the content of a tab pins that tab (using a preview
   * tab keeps it), only the explorer replaces the preview tab
   */
  open(ref: ViewRef, options: { preview?: boolean; from?: 'explorer' | 'view' } = {}): void {
    if (options.from !== 'explorer' && this.editor.activeKey) {
      this.editor.pin(this.editor.activeKey);
    }
    // validated and normalized: the params come from code, but also from the main process or a restored tab
    const parsed = parseViewRef(ref);
    if (viewDefinition(parsed.view).location === 'panel') {
      this.panel.open(parsed, options);
      this.panelVisible = true;
    } else {
      this.editor.open(parsed, options);
    }
  }

  /** whether the view of the tab can be opened several times (see `instances` in `defineView`) */
  allowsInstances(tab: Tab | undefined): tab is Tab {
    return !!tab && viewDefinition(tab.ref.view).instances === 'multiple';
  }

  /** opens another instance of the view of the tab, e.g. another terminal in the same container */
  openInstance(tab: Tab): void {
    this.open(tab.ref);
  }

  togglePanel(): void {
    this.panelVisible = !this.panelVisible;
  }
}
