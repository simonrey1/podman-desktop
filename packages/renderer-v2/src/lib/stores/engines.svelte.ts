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

import type { ProviderContainerConnectionInfo, ProviderInfo } from '@desktop-framework/api';

import { ListState } from '#lib/stores/list.svelte.js';

/** Events changing the providers or the status of their connections. */
export const PROVIDER_EVENTS = [
  'provider-change',
  'provider-create',
  'provider-delete',
  'provider:update-status',
  'provider-container-connection-update-status',
  'extensions-started',
] as const;

/** A container engine connection, e.g. a Podman machine. */
export interface Engine {
  /** the id used by the resources of this connection: `<provider id>.<connection name>` */
  id: string;
  name: string;
  providerName: string;
  status: ProviderContainerConnectionInfo['status'];
}

/**
 * The container engines of the providers, and the one selected in the explorer.
 */
export class EnginesStore {
  readonly #providers = new ListState<ProviderInfo>(() => window.getProviderInfos(), PROVIDER_EVENTS);

  readonly all: Engine[] = $derived(
    this.#providers.items.flatMap(provider =>
      provider.containerConnections.map(connection => ({
        id: `${provider.id}.${connection.name}`,
        name: connection.displayName ?? connection.name,
        providerName: provider.name,
        status: connection.status,
      })),
    ),
  );

  readonly loaded = $derived(this.#providers.loaded);

  #selectedId: string | undefined = $state();

  /** the selected engine, or the first started one */
  readonly selected: Engine | undefined = $derived(
    this.all.find(engine => engine.id === this.#selectedId) ??
      this.all.find(engine => engine.status === 'started') ??
      this.all[0],
  );

  get(id: string): Engine | undefined {
    return this.all.find(engine => engine.id === id);
  }

  select(id: string): void {
    this.#selectedId = id;
  }

  start(): () => void {
    return this.#providers.start();
  }
}
