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

import { errorMessage } from '#lib/stores/actions.svelte.js';
import type { ConnectionKind, EnginesStore } from '#lib/stores/engines.svelte.js';

/** What to create: a connection of a kind, with a provider, from the values of its form. */
export interface CreationRequest {
  provider: ProviderInfo;
  kind: ConnectionKind;
  /** e.g. Podman machine */
  label: string;
  params: Record<string, unknown>;
}

/** the color of a line of a provider, by its level (ANSI): the tools write their progress as warnings (stderr) */
const COLORS = { log: '', warn: '', error: '\x1b[31m' };

/** A creation, running or done: its output is kept for the sessions showing it, even opened later. */
export class Creation {
  readonly id: string;
  readonly request: CreationRequest;
  status: 'running' | 'succeeded' | 'failed' | 'canceled' = $state('running');
  error: string | undefined = $state();
  /** the connections before: the one created is the connection of the provider and the kind appearing after them */
  before: readonly string[] = [];

  readonly #output: string[] = [];
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the sessions writing the output, not a reactive state
  readonly #listeners = new Set<(data: string) => void>();
  #tokenId: number | undefined;

  constructor(id: string, request: CreationRequest) {
    this.id = id;
    this.request = request;
  }

  /** the output so far, then as it comes; @returns a function unsubscribing */
  onOutput(listener: (data: string) => void): () => void {
    for (const data of this.#output) {
      listener(data);
    }
    this.#listeners.add(listener);
    return (): void => {
      this.#listeners.delete(listener);
    };
  }

  #write(level: 'log' | 'warn' | 'error', text: string): void {
    // the provider writes lines, some with their end: the terminal needs carriage returns
    const lines = text.replace(/\r?\n$/, '').replaceAll(/\r?\n/g, '\r\n');
    const data = `${COLORS[level]}${lines}${COLORS[level] ? '\x1b[0m' : ''}\r\n`;
    this.#output.push(data);
    for (const listener of this.#listeners) {
      listener(data);
    }
  }

  async run(engines: EnginesStore): Promise<void> {
    const { provider, kind, params } = this.request;
    this.before = engines.connections.map(connection => connection.id);
    const logger = (_key: symbol, event: 'log' | 'warn' | 'error' | 'finish', args: string[]): void => {
      if (event !== 'finish') {
        this.#write(event, args.join(' '));
      }
    };
    const create = {
      container: window.createContainerProviderConnection,
      kubernetes: window.createKubernetesProviderConnection,
      vm: window.createVmProviderConnection,
    }[kind];
    try {
      this.#tokenId = await window.getCancellableTokenSource();
      await create(provider.internalId, params, Symbol(this.id), logger, this.#tokenId, undefined);
      this.status = 'succeeded';
    } catch (error: unknown) {
      const message = errorMessage(error);
      if (this.status === 'canceled' || message.includes('Execution cancelled')) {
        this.status = 'canceled';
      } else {
        this.status = 'failed';
        // a provider can fail with the whole output of a command: its first line in the form, all of it here
        this.#write('error', message);
        this.error = message.length > 200 ? `${message.split('\n')[0]?.slice(0, 200) ?? ''}…` : message;
      }
    } finally {
      this.#tokenId = undefined;
    }
  }

  async cancel(): Promise<void> {
    if (this.#tokenId !== undefined) {
      this.status = 'canceled';
      this.#write('warn', 'Canceled');
      await window.cancelToken(this.#tokenId);
    }
  }
}

/** The creations of connections started in this window: a creation runs whether its form or its output are shown. */
export class CreationsStore {
  all: Creation[] = $state([]);
  #next = 0;
  readonly #engines: EnginesStore;

  constructor(engines: EnginesStore) {
    this.#engines = engines;
  }

  get(id: string): Creation | undefined {
    return this.all.find(creation => creation.id === id);
  }

  start(request: CreationRequest): Creation {
    const creation = new Creation(`creation-${++this.#next}`, request);
    this.all.push(creation);
    creation.run(this.#engines).catch((error: unknown) => console.error(`Error creating a ${request.label}`, error));
    return creation;
  }
}
