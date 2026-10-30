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

import { type InferredNavigationRequest, NavigationPage } from '@desktop-framework/api';

import { receive } from '#lib/api/events.js';
import type { CreationsStore } from '#lib/stores/creations.svelte.js';
import type { Connection, ConnectionKind, EnginesStore } from '#lib/stores/engines.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { Workbench } from '#lib/workbench/workbench.svelte.js';

/**
 * Where the main process sends the user, e.g. the action of a task: the provider tasks, the connections, the catalog and the
 * webviews for now, the other pages are not handled yet.
 */
export class NavigationHandler {
  readonly #workbench: Workbench;
  readonly #engines: EnginesStore;
  readonly #creations: CreationsStore;

  constructor(workbench: Workbench, engines: EnginesStore, creations: CreationsStore) {
    this.#workbench = workbench;
    this.#engines = engines;
    this.#creations = creations;
  }

  start(): () => void {
    return receive<InferredNavigationRequest<NavigationPage>>('navigate', request => this.#navigate(request));
  }

  #navigate(request: InferredNavigationRequest<NavigationPage>): void {
    switch (request.page) {
      case NavigationPage.PROVIDER_TASK: {
        const { internalId, taskId } = request.parameters;
        this.#openProviderTask(internalId, taskId);
        break;
      }
      case NavigationPage.CONTAINER_CONNECTION: {
        const { provider, name } = request.parameters;
        this.#openConnection(provider, 'container', connection => connection.name === name);
        break;
      }
      case NavigationPage.KUBERNETES_CONNECTION: {
        const { provider, apiURL } = request.parameters;
        this.#openConnection(
          provider,
          'kubernetes',
          connection =>
            'endpoint' in connection.info &&
            'apiURL' in connection.info.endpoint &&
            connection.info.endpoint.apiURL === apiURL,
        );
        break;
      }
      case NavigationPage.VM_CONNECTION: {
        const { provider, name } = request.parameters;
        this.#openConnection(provider, 'vm', connection => connection.name === name);
        break;
      }
      case NavigationPage.WEBVIEW:
        this.#openWebview(request.parameters.id).catch((error: unknown) =>
          console.error('Error opening a webview', error),
        );
        break;
      case NavigationPage.EXTENSIONS_CATALOG:
        this.#workbench.open(viewRef('extensions', {}), {
          state: { section: 'catalog', filter: request.parameters.searchTerm ?? '' },
        });
        break;
      default:
        console.warn(`Navigation to ${request.page} is not handled`);
    }
  }

  /** a webview an extension just created is asked right after its creation: read from the main process */
  async #openWebview(id: string): Promise<void> {
    const webview = (await window.listWebviews()).find(item => item.id === id);
    if (webview) {
      this.#workbench.open(viewRef('webview', { viewType: webview.viewType, sourcePath: webview.sourcePath }));
    }
  }

  /** the form of the creation and the output of this attempt; the system overview for a task with no creation here */
  #openProviderTask(internalId: string, taskId: number | undefined): void {
    const creation = this.#creations.ofTask(internalId, taskId);
    if (!creation) {
      this.#workbench.open(viewRef('dashboard', {}));
      return;
    }
    const { provider, kind } = creation.request;
    this.#workbench.open(viewRef('connection-create', { providerId: provider.id, kind }));
    this.#workbench.open(viewRef('creation-output', { creationId: creation.id }));
  }

  #openConnection(internalId: string, kind: ConnectionKind, matches: (connection: Connection) => boolean): void {
    const connection = this.#engines.connections.find(
      item => item.provider.internalId === internalId && item.kind === kind && matches(item),
    );
    if (!connection) {
      // removed since: where the connections are
      this.#workbench.open(viewRef('dashboard', {}));
    } else if (connection.engineId) {
      this.#workbench.open(viewRef('engine', { engineId: connection.engineId }));
    } else {
      this.#workbench.open(viewRef('connection', { connectionId: connection.id }));
    }
  }
}
