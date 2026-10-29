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

import type { ProviderConnectionInfo, ProviderContainerConnectionInfo, ProviderInfo } from '@desktop-framework/api';

import { ListState } from '#lib/stores/list.svelte.js';

/** Events changing the providers or the status of their connections. */
export const PROVIDER_EVENTS = [
  'provider-change',
  'provider-create',
  'provider-delete',
  'provider:update-status',
  'provider-container-connection-update-status',
  'provider-register-kubernetes-connection',
  'provider-unregister-kubernetes-connection',
  'provider-register-vm-connection',
  'provider-unregister-vm-connection',
  'provider:update-version',
  'provider:update-warnings',
  'extensions-started',
] as const;

/** A container engine connection, e.g. a Podman machine. */
export interface Engine {
  /** the id used by the resources of this connection: `<provider id>.<connection name>` */
  id: string;
  name: string;
  providerName: string;
  status: ProviderContainerConnectionInfo['status'];
  /** to create resources on the engine (e.g. a volume) */
  connection: ProviderContainerConnectionInfo;
}

/** The kinds of connections a provider registers: the container engines are the resources of v2. */
export type ConnectionKind = ProviderConnectionInfo['connectionType'];

/** A connection of a provider, of any kind: a container engine, a Kubernetes cluster, a virtual machine. */
export interface Connection {
  /** `<provider id>.<kind>.<connection name>`: unique among the connections of every kind */
  id: string;
  /** a container connection: the id of its engine, the one of its resources (`<provider id>.<connection name>`) */
  engineId?: string;
  kind: ConnectionKind;
  name: string;
  provider: ProviderInfo;
  info: ProviderConnectionInfo;
}

/**
 * The container engines of the providers, and the one selected in the explorer; the connections of every kind.
 */
export class EnginesStore {
  readonly #providers = new ListState<ProviderInfo>(() => window.getProviderInfos(), PROVIDER_EVENTS);

  readonly loaded = $derived(this.#providers.loaded);

  readonly providers: ProviderInfo[] = $derived(this.#providers.items);

  /** the connections of every kind, by provider: the container engines, then the Kubernetes clusters, then the VMs */
  readonly connections: Connection[] = $derived(
    this.#providers.items.flatMap(provider =>
      [...provider.containerConnections, ...provider.kubernetesConnections, ...provider.vmConnections].map(info => ({
        id: `${provider.id}.${info.connectionType}.${info.name}`,
        engineId: info.connectionType === 'container' ? `${provider.id}.${info.name}` : undefined,
        kind: info.connectionType,
        name: info.connectionType === 'container' ? (info.displayName ?? info.name) : info.name,
        provider,
        info,
      })),
    ),
  );

  /** the container connections, as engines: their id is the one of their resources */
  readonly all: Engine[] = $derived(
    this.connections.flatMap(connection =>
      connection.info.connectionType === 'container' && connection.engineId
        ? [
            {
              id: connection.engineId,
              name: connection.name,
              providerName: connection.provider.name,
              status: connection.info.status,
              connection: connection.info,
            },
          ]
        : [],
    ),
  );

  connection(id: string): Connection | undefined {
    return this.connections.find(connection => connection.id === id);
  }

  #selectedId: string | undefined = $state();

  /** the selected engine, else the first started one (then kept, see start) */
  readonly selected: Engine | undefined = $derived(
    this.all.find(engine => engine.id === this.#selectedId) ??
      this.all.find(engine => engine.status === 'started') ??
      this.all[0],
  );

  get(id: string): Engine | undefined {
    return this.all.find(engine => engine.id === id);
  }

  /** e.g. "Podman · podman-machine-default", for the summaries */
  label(id: string, fallback: string): string {
    const engine = this.get(id);
    return engine ? `${engine.providerName} · ${engine.name}` : fallback;
  }

  select(id: string): void {
    this.#selectedId = id;
  }

  start(): () => void {
    const stopProviders = this.#providers.start();
    // the engine shown by default is kept once shown: it does not change when the state of the engines changes
    // (e.g. another engine becoming the first started one), only when it disappears
    const stopKeeping = $effect.root(() => {
      $effect(() => {
        const shown = this.selected;
        if (shown && shown.id !== this.#selectedId) {
          this.#selectedId = shown.id;
        }
      });
    });
    return (): void => {
      stopKeeping();
      stopProviders();
    };
  }
}
