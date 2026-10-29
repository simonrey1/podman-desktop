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

import type { ProviderContainerConnectionInfo } from '@desktop-framework/api';
import { untrack } from 'svelte';

import { receive } from '#lib/api/events.js';
import type { App } from '#lib/app.svelte.js';

/** A resource of a connection: how much it has, and how much of it is used (0 to 100). */
export interface UsageMetric {
  total: number;
  percent: number;
}

/** The CPUs, the memory and the disk of a connection (e.g. a Podman machine), the ones its provider reports. */
export interface ConnectionUsageMetrics {
  cpu?: UsageMetric;
  memory?: UsageMetric;
  disk?: UsageMetric;
}

/** the formats of the settings of a connection giving its resources; their usage is the setting `<id>Usage` */
const FORMATS = { cpu: 'cpu', memory: 'memory', disk: 'diskSize' } as const;

/**
 * The usage of a container connection, from the settings of its provider (scope ContainerConnection): read when the
 * component creating it is mounted, and again when one of them changes. Created in a component (it uses an effect).
 */
export class ConnectionUsage {
  metrics: ConnectionUsageMetrics | undefined = $state.raw();

  // the connection read while it is started, by its name: not again each time the list of the providers is reloaded
  readonly #started: string | undefined;

  constructor(app: App, connection: () => ProviderContainerConnectionInfo | undefined) {
    this.#started = $derived.by(() => {
      const target = connection();
      return target?.status === 'started' ? target.name : undefined;
    });
    $effect(() => {
      const name = this.#started;
      const target = untrack(connection);
      const settings = app.configuration.items.filter(
        setting =>
          setting.scope === 'ContainerConnection' ||
          (Array.isArray(setting.scope) && setting.scope.includes('ContainerConnection')),
      );
      const ids = settings.flatMap(setting => (setting.id ? [setting.id] : []));
      if (!name || !target || ids.length === 0) {
        this.metrics = undefined;
        return;
      }
      const scope = $state.snapshot(target);
      let current = true;
      const read = (): void => {
        Promise.all(
          Object.entries(FORMATS).map(async ([metric, format]) => {
            const setting = settings.find(item => item.format === format);
            if (!setting) {
              return [metric, undefined] as const;
            }
            const [total, percent] = await Promise.all([
              window.getConfigurationValue<number>(setting.id, scope as never),
              window.getConfigurationValue<number>(`${setting.id}Usage`, scope as never),
            ]);
            return [
              metric,
              typeof total === 'number' ? { total, percent: typeof percent === 'number' ? percent : 0 } : undefined,
            ] as const;
          }),
        )
          .then(entries => {
            if (current) {
              const metrics = Object.fromEntries(entries.filter(([, value]) => value)) as ConnectionUsageMetrics;
              this.metrics = Object.keys(metrics).length ? metrics : undefined;
            }
          })
          .catch((error: unknown) => console.error('Error reading the usage of a connection', error));
      };
      read();
      // the provider updates the usage in the settings of the connection
      const stop = receive<{ key: string }>('onDidChangeConfiguration', ({ key }) => {
        if (ids.includes(key) || ids.includes(key.replace(/Usage$/, ''))) {
          read();
        }
      });
      return (): void => {
        current = false;
        stop();
      };
    });
  }
}
