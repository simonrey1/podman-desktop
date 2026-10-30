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
  ContextKeyExpr,
  type ContextKeyValue,
  type IContext,
  setContextKeysPlatform,
} from '@desktop-framework/api/context';
import { SvelteMap } from 'svelte/reactivity';

import { receive, whenExtensionsStarted } from '#lib/api/events.js';

/**
 * The context keys of the main process (set by the extensions and the core, e.g. `podman.podmanMachineCpuSupported`),
 * kept up to date, to evaluate the `when` clauses (of the settings, of the forms of the connections, of the menus).
 * A key can be the property of another one: `command.status` reads `status` in the value of `command`.
 */
export class ContextStore implements IContext {
  readonly #values = new SvelteMap<string, unknown>();
  /** the clauses parsed once: they are evaluated each time a key changes */
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- a cache of parsed expressions, not a reactive state
  readonly #parsed = new Map<string, ReturnType<typeof ContextKeyExpr.deserialize>>();
  // the constants of the platform are substituted when a clause is parsed: parsed again once they change
  #platform = $state('');

  getValue<T extends ContextKeyValue = ContextKeyValue>(key: string): T | undefined {
    if (this.#values.has(key)) {
      return this.#values.get(key) as T;
    }
    // a property of a key: `command.status`
    const [first, ...rest] = key.split('.');
    if (!first || rest.length === 0) {
      return undefined;
    }
    let value: unknown = this.#values.get(first);
    for (const bit of rest) {
      value = value && typeof value === 'object' ? (value as Record<string, unknown>)[bit] : undefined;
    }
    return value as T | undefined;
  }

  /** whether a `when` clause holds (no clause holds) */
  evaluate(when: string | undefined): boolean {
    if (!when) {
      return true;
    }
    // the platform is a constant of the clauses: none holds until it is known (they are evaluated again then)
    if (!this.#platform) {
      return false;
    }
    if (!this.#parsed.has(when)) {
      this.#parsed.set(when, ContextKeyExpr.deserialize(when));
    }
    return this.#parsed.get(when)?.evaluate(this) ?? false;
  }

  /** the constants of the platform in the clauses: `isLinux`, `isMac`, `isWindows` */
  setPlatform(platform: string): void {
    setContextKeysPlatform(platform);
    this.#parsed.clear();
    this.#platform = platform;
  }

  start(): () => void {
    const stops = [
      receive<{ key: string; value: unknown }>('context-value-updated', ({ key, value }) =>
        this.#values.set(key, value),
      ),
      receive<{ key: string }>('context-key-removed', ({ key }) => this.#values.delete(key)),
    ];
    // the keys set before this window listened: once the extensions are started
    whenExtensionsStarted()
      .then(() => window.contextCollectAllValues())
      .then(values => {
        for (const [key, value] of Object.entries(values)) {
          this.#values.set(key, value);
        }
      })
      .catch((error: unknown) => console.error('Error reading the context keys', error));
    return (): void => {
      for (const stop of stops) {
        stop();
      }
    };
  }
}
