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

import type { ConfigurationScope, IConfigurationPropertyRecordedSchema } from '@desktop-framework/api/configuration';
import { SvelteMap } from 'svelte/reactivity';

import { receive } from '#lib/api/events.js';
import { ListState } from '#lib/stores/list.svelte.js';

/** A setting: a property of the configuration, registered by Podman Desktop or an extension. */
export type Setting = IConfigurationPropertyRecordedSchema & { id: string };

/** A section of the settings: the settings of a configuration node (e.g. `preferences.terminal`), and its children. */
export interface SettingsSection {
  /** the first segment of the ids of its nodes, e.g. `preferences` */
  id: string;
  title: string;
  /** its nodes, e.g. Terminal: their settings are grouped under their title */
  nodes: { id: string; title: string }[];
}

function hasScope(setting: Setting, scope: ConfigurationScope): boolean {
  return Array.isArray(setting.scope) ? setting.scope.includes(scope) : setting.scope === scope;
}

/**
 * The settings of the settings pages: the default scope (not the settings of a connection, of an onboarding), not
 * hidden. The settings with a `when` clause wait for the context keys of the extensions (phase 9): not shown.
 */
function isShown(setting: Setting): boolean {
  return hasScope(setting, 'DEFAULT') && !setting.hidden && !setting.when;
}

/** the title of a section: its id in start case, e.g. `preferences` → `Preferences` */
function sectionTitle(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1).replaceAll(/([a-z])([A-Z])/g, '$1 $2');
}

/**
 * The settings, their sections, and their values: a value is read the first time it is shown, then kept up to date
 * with the changes of the configuration (from a page, a command, an extension).
 */
export class ConfigurationStore extends ListState<Setting> {
  readonly shown: Setting[] = $derived(this.items.filter(isShown));
  readonly experimental: Setting[] = $derived(this.items.filter(setting => !!setting.experimental && !setting.hidden));

  readonly sections: SettingsSection[] = $derived.by(() => {
    const sections: Record<string, SettingsSection> = {};
    for (const setting of this.shown) {
      const [id = setting.parentId] = setting.parentId.split('.');
      const section = (sections[id] ??= { id, title: sectionTitle(id), nodes: [] });
      if (!section.nodes.some(node => node.id === setting.parentId)) {
        section.nodes.push({ id: setting.parentId, title: setting.title });
      }
    }
    return Object.values(sections)
      .map(section => ({ ...section, nodes: section.nodes.toSorted((a, b) => a.title.localeCompare(b.title)) }))
      .toSorted((a, b) => a.title.localeCompare(b.title));
  });

  readonly #values = new SvelteMap<string, unknown>();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the values being read, not a reactive state
  readonly #reading = new Set<string>();

  constructor() {
    super(
      async () =>
        Object.entries(await window.getConfigurationProperties()).map(
          ([id, property]) => ({ ...(property as IConfigurationPropertyRecordedSchema), id }) as Setting,
        ),
      ['configuration-changed', 'extensions-started', 'extension-started', 'extension-stopped'],
    );
  }

  override start(): () => void {
    const stop = super.start();
    const stopChanges = receive<{ key: string; value: unknown }>('onDidChangeConfiguration', ({ key, value }) => {
      if (this.#values.has(key)) {
        this.#values.set(key, value);
      }
    });
    return (): void => {
      stop();
      stopChanges();
    };
  }

  /** the value of a setting: undefined until read (it is read the first time it is asked) */
  value(id: string): unknown {
    if (!this.#values.has(id) && !this.#reading.has(id)) {
      this.#reading.add(id);
      window
        .getConfigurationValue(id, 'DEFAULT')
        .then(value => this.#values.set(id, value))
        .catch((error: unknown) => console.error(`Error reading the setting ${id}`, error))
        .finally(() => this.#reading.delete(id));
    }
    return this.#values.get(id);
  }

  /** whether the value of the setting is read */
  isRead(id: string): boolean {
    return this.#values.has(id);
  }

  /** writes the value of a setting (an experimental feature is enabled with `{}`, disabled with `false`) */
  async update(setting: Setting, value: unknown): Promise<void> {
    const previous = this.#values.get(setting.id);
    this.#values.set(setting.id, value);
    try {
      if (setting.experimental) {
        await window.updateExperimentalConfigurationValue(setting.id, value, setting.scope);
      } else {
        await window.updateConfigurationValue(setting.id, value, setting.scope);
      }
    } catch (error: unknown) {
      this.#values.set(setting.id, previous);
      throw error;
    }
  }

  /** the settings of a section or of one of its nodes (by the id of the node, or the start of it) */
  of(prefix: string): Setting[] {
    return this.shown.filter(setting => setting.parentId === prefix || setting.parentId.startsWith(`${prefix}.`));
  }
}
