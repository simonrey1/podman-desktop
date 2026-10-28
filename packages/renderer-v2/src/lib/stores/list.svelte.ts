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

import { subscribe } from '#lib/api/events.js';

/**
 * A list of resources loaded from the main process, and reloaded when one of the given events is received.
 */
export class ListState<T> {
  items: T[] = $state.raw([]);
  loaded = $state(false);

  readonly #load: () => Promise<T[]>;
  readonly #channels: readonly string[];
  #loading = false;
  #reloadRequested = false;

  constructor(load: () => Promise<T[]>, channels: readonly string[]) {
    this.#load = load;
    this.#channels = channels;
  }

  /** Loads the list and keeps it up to date, returns a function to stop listening. */
  start(): () => void {
    const unsubscribe = subscribe(this.#channels, () => this.refresh());
    this.refresh();
    return unsubscribe;
  }

  refresh(): void {
    // events often come in bursts: never run two loads at the same time, reload once at the end instead
    if (this.#loading) {
      this.#reloadRequested = true;
      return;
    }
    this.#loading = true;
    this.#load()
      .then(items => {
        this.items = items;
        this.loaded = true;
      })
      .catch((error: unknown) => console.error('Error loading a list', error))
      .finally(() => {
        this.#loading = false;
        if (this.#reloadRequested) {
          this.#reloadRequested = false;
          this.refresh();
        }
      });
  }
}
