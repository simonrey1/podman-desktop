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

import type { WebviewInfo } from '@desktop-framework/api';

import { whenExtensionsStarted } from '#lib/api/events.js';
import { ListState } from '#lib/stores/list.svelte.js';

/**
 * What identifies a webview for its tab, across the restarts of its extension (which creates it again, with another
 * id): the extension and the type of its panel. The extensions create one panel of a type.
 */
export interface WebviewIdentity {
  viewType: string;
  sourcePath: string;
}

/** The webviews created by the extensions, by their name. */
export class WebviewsStore extends ListState<WebviewInfo> {
  /** the extensions are started: a webview not listed will not come, its extension is stopped or removed */
  started = $state(false);
  readonly #activeIdentity: () => WebviewIdentity | undefined;
  readonly #visibleId: string = $derived.by(() => {
    const identity = this.#activeIdentity();
    return identity ? (this.find(identity)?.id ?? '') : '';
  });

  /** @param activeIdentity the webview of the active tab */
  constructor(activeIdentity: () => WebviewIdentity | undefined) {
    super(
      async () => (await window.listWebviews()).toSorted((a, b) => a.name.localeCompare(b.name)),
      [
        'extension-stopped',
        'extensions-started',
        'extension-started',
        'webview-create',
        'webview-update',
        'webview-delete',
      ],
    );
    this.#activeIdentity = activeIdentity;
  }

  override start(): () => void {
    const stop = super.start();
    whenExtensionsStarted()
      .then(() => {
        this.started = true;
        this.refresh();
      })
      .catch((error: unknown) => console.error('Error waiting for the extensions', error));
    // the extensions know which of their webviews is shown: the one of the active tab, whichever is kept mounted
    const stopVisible = $effect.root(() => {
      $effect(() => {
        if (this.started) {
          window
            .makeDefaultWebviewVisible(this.#visibleId)
            .catch((error: unknown) => console.error('Error making a webview visible', error));
        }
      });
    });
    return (): void => {
      stop();
      stopVisible();
    };
  }

  find(identity: WebviewIdentity): WebviewInfo | undefined {
    return this.items.find(item => item.viewType === identity.viewType && item.sourcePath === identity.sourcePath);
  }
}
