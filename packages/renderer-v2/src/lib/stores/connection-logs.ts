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

/** the color of a line of a provider, by its level (ANSI): the tools write their progress as warnings (stderr) */
const COLORS = { log: '', warn: '', error: '\x1b[31m' };

/**
 * The output of the lifecycle operations of the connections (start, stop, edit...), as their provider logs it: kept
 * in this window, for the sessions of their logs, even opened later.
 */
export class ConnectionLogs {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the output written to the sessions, not a reactive state
  readonly #output = new Map<string, string[]>();
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the sessions writing the output, not a reactive state
  readonly #listeners = new Map<string, Set<(data: string) => void>>();

  /** a line of a provider about a connection, e.g. while it starts */
  write(connectionId: string, level: 'log' | 'warn' | 'error', text: string): void {
    // the provider writes lines, some with their end: the terminal needs carriage returns
    const lines = text.replace(/\r?\n$/, '').replaceAll(/\r?\n/g, '\r\n');
    const data = `${COLORS[level]}${lines}${COLORS[level] ? '\x1b[0m' : ''}\r\n`;
    const output = this.#output.get(connectionId) ?? [];
    output.push(data);
    this.#output.set(connectionId, output);
    for (const listener of this.#listeners.get(connectionId) ?? []) {
      listener(data);
    }
  }

  /** a title before the output of an operation, e.g. `Starting` */
  begin(connectionId: string, title: string): void {
    this.write(connectionId, 'log', `\x1b[1m${title}\x1b[0m`);
  }

  /** the output so far, then as it comes; @returns a function unsubscribing */
  onOutput(connectionId: string, listener: (data: string) => void): () => void {
    for (const data of this.#output.get(connectionId) ?? []) {
      listener(data);
    }
    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the sessions of a connection, not a reactive state
    const listeners = this.#listeners.get(connectionId) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(connectionId, listeners);
    return (): void => {
      listeners.delete(listener);
    };
  }
}
