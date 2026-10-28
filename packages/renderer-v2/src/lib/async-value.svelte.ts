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

/**
 * A value loaded asynchronously, reloaded when the reactive values read by `load` change: e.g. the inspect data
 * of a resource, reloaded when its state changes. The responses arriving after a newer request are ignored.
 * Must be created while a component initializes (it uses an effect).
 */
export class AsyncValue<T> {
  value: T | undefined = $state.raw();
  error: string | undefined = $state();
  loading = $state(false);

  #request = 0;

  /** @param load returns the promise of the value, or undefined to keep the current value */
  constructor(load: () => Promise<T> | undefined) {
    $effect(() => {
      const promise = load();
      if (!promise) {
        return;
      }
      const request = ++this.#request;
      this.loading = true;
      promise
        .then(value => {
          if (request === this.#request) {
            this.value = value;
            this.error = undefined;
          }
        })
        .catch((error: unknown) => {
          if (request === this.#request) {
            this.error = String(error);
          }
        })
        .finally(() => {
          if (request === this.#request) {
            this.loading = false;
          }
        });
    });
  }
}
