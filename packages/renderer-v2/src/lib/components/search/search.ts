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

/** The matches of a search: the selected one (from 0, -1 when none) and their number. */
export interface SearchResults {
  index: number;
  count: number;
}

/**
 * What a search field searches: a terminal, an editor... The field calls `find` as the query is typed
 * (`incremental`: the match at the current position, or the next one) and on previous / next.
 */
export interface SearchTarget {
  find(query: string, direction: 'incremental' | 'next' | 'previous'): void;
  /** removes the highlights of the matches */
  clear(): void;
  /** called with the matches after each search; @returns a function unsubscribing */
  onResults(listener: (results: SearchResults) => void): () => void;
  /** called when the user asks to search from the target, e.g. Ctrl+F; @returns a function unsubscribing */
  onFindRequest(listener: () => void): () => void;
}

/** a list of listeners, for the events of the targets */
export class Listeners<T extends unknown[]> {
  readonly #listeners = new Set<(...args: T) => void>();

  add(listener: (...args: T) => void): () => void {
    this.#listeners.add(listener);
    return (): void => {
      this.#listeners.delete(listener);
    };
  }

  emit(...args: T): void {
    for (const listener of this.#listeners) {
      listener(...args);
    }
  }
}
