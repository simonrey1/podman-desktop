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

import type { ProviderInfo } from '@desktop-framework/api';
import type { ConfigurationScope } from '@desktop-framework/api/configuration';
import type { AuditRecord } from '@podman-desktop/api';
import { untrack } from 'svelte';

import type { App } from '#lib/app.svelte.js';
import { defaultValue, settingKind } from '#lib/components/settings/settings.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import type { Setting } from '#lib/stores/configuration.svelte.js';
import type { Connection, ConnectionKind } from '#lib/stores/engines.svelte.js';

// the scope of the settings of the form: the factory (creation) or the connection (edition)
const SCOPES: Record<ConnectionKind, { create: ConfigurationScope; edit: ConfigurationScope }> = {
  container: { create: 'ContainerProviderConnectionFactory', edit: 'ContainerConnection' },
  kubernetes: { create: 'KubernetesProviderConnectionFactory', edit: 'KubernetesConnection' },
  vm: { create: 'VmProviderConnectionFactory', edit: 'VmConnection' },
};

/** what a provider creates, in words: e.g. Podman machine, Kind cluster */
export function creationLabel(provider: ProviderInfo, kind: ConnectionKind): string {
  return (
    {
      container: provider.containerProviderConnectionCreationDisplayName,
      kubernetes: provider.kubernetesProviderConnectionCreationDisplayName,
      vm: provider.vmProviderConnectionCreationDisplayName,
    }[kind] ?? provider.name
  );
}

/**
 * The fields and the values of the form creating a connection of a provider, or editing one: the settings of the
 * provider for it (their `when` clause holding), bounded by the host, checked by the provider for a creation, read from
 * the connection for an edition (which sends the values changed only). Created in a component (it uses effects).
 */
export class ConnectionForm {
  values: Record<string, unknown> = $state({});
  loaded = $state(false);
  error: string | undefined = $state();
  /** the checks of the provider of a creation, e.g. a port taken */
  audit: AuditRecord[] = $state.raw([]);
  readonly invalid: boolean = $derived(this.audit.some(record => record.type === 'error'));
  readonly fields: Setting[];
  readonly changed: string[];

  #initial: Record<string, unknown> = {};
  #host: { cpu: number; memory: number; disk: number } | undefined = $state.raw();

  /** @param restored the values of a creation to go back to, over the defaults */
  constructor(
    app: App,
    provider: () => ProviderInfo | undefined,
    kind: ConnectionKind,
    editing?: Connection,
    restored?: Record<string, unknown>,
  ) {
    const scope = SCOPES[kind][editing ? 'edit' : 'create'];
    // the host bounds the resources of a connection (its CPUs, its memory, its disk)
    Promise.all([window.getOsCpu(), window.getOsMemory(), window.getOsFreeDiskSize()])
      .then(([cpu, memory, disk]) => {
        this.#host = { cpu: Number(cpu), memory: Number(memory), disk: Number(disk) };
      })
      .catch((error: unknown) => console.error('Error reading the resources of the host', error));

    this.fields = $derived.by(() => {
      const target = provider();
      if (!target) {
        return [];
      }
      return app.configuration.items
        .filter(setting => (Array.isArray(setting.scope) ? setting.scope.includes(scope) : setting.scope === scope))
        .filter(setting => setting.id.startsWith(target.id) && !setting.hidden && app.context.evaluate(setting.when))
        .filter(setting => !(editing && setting.readonly))
        .filter(setting => settingKind(setting) !== 'unsupported')
        .map(setting => this.#resolved(setting));
    });
    this.changed = $derived(
      Object.keys(this.values).filter(
        id => JSON.stringify(this.values[id] ?? null) !== JSON.stringify(this.#initial[id] ?? null),
      ),
    );

    // the values: the defaults of a creation, the values of the connection for an edition
    $effect(() => {
      if (this.loaded || !this.#host || !this.fields.length) {
        return;
      }
      const target = untrack(() => this.fields);
      if (!editing) {
        this.values = Object.fromEntries(target.map(field => [field.id, restored?.[field.id] ?? defaultValue(field)]));
        this.loaded = true;
        return;
      }
      const info = $state.snapshot(editing.info) as unknown as ConfigurationScope;
      Promise.all(target.map(async field => [field.id, await window.getConfigurationValue(field.id, info)] as const))
        .then(entries => {
          // a provider can store a number as a string (e.g. the memory of a machine): numbers, as the controls give them
          const read = Object.fromEntries(
            entries.map(([id, value]) => {
              const field = target.find(item => item.id === id);
              const number = field && settingKind(field) === 'number' && typeof value === 'string' && value !== '';
              return [id, number ? Number(value) : value];
            }),
          );
          this.#initial = read;
          this.values = { ...read };
          this.loaded = true;
        })
        .catch((error: unknown) => {
          this.error = errorMessage(error);
        });
    });

    // the provider checks the values of a creation (e.g. the memory left on the host)
    $effect(() => {
      const target = untrack(provider);
      if (editing || !this.loaded || !target) {
        return;
      }
      const items = $state.snapshot(this.values);
      const timer = setTimeout(() => {
        window
          .auditConnectionParameters(target.internalId, items)
          .then(result => {
            this.audit = result.records;
          })
          .catch((error: unknown) => console.error('Error checking the values of the connection', error));
      }, 400);
      return (): void => clearTimeout(timer);
    });
  }

  /** the values to send: all of them for a creation, the ones changed for an edition */
  params(editing: boolean): Record<string, unknown> {
    const values = $state.snapshot(this.values);
    return editing ? Object.fromEntries(Object.entries(values).filter(([id]) => this.changed.includes(id))) : values;
  }

  #resolved(setting: Setting): Setting {
    const host = this.#host;
    const limits: Record<string, number | undefined> = {
      HOST_TOTAL_CPU: host?.cpu,
      HOST_TOTAL_MEMORY: host?.memory,
      HOST_TOTAL_DISKSIZE: host?.disk,
    };
    const maximum = typeof setting.maximum === 'string' ? limits[setting.maximum] : setting.maximum;
    const half = host ? Math.max(1, Math.floor(host.cpu / 2)) : 1;
    return {
      ...setting,
      maximum: maximum ?? undefined,
      default: setting.default === 'HOST_HALF_CPU_CORES' ? half : setting.default,
    };
  }
}
