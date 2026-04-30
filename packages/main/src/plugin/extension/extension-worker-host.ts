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
 * EXPERIMENTAL – Extension Worker Thread Host
 *
 * This module explores running each extension in its own worker thread
 * for true isolation. It is a proof-of-concept to identify blockers.
 *
 * Architecture:
 *   Main thread                     Worker thread
 *   ─────────────                   ─────────────
 *   ExtensionWorkerHost             extension-worker-runtime.ts
 *     │                                │
 *     │── postMessage(init) ──────────>│  require(extension), call activate()
 *     │                                │
 *     │<── postMessage(api-call) ──────│  extension calls containerDesktopAPI.*
 *     │── postMessage(api-result) ────>│  proxy resolves promise
 *     │                                │
 *     │<── postMessage(callback) ──────│  main invokes registered callback
 *     │── postMessage(callback-res) ──>│
 *
 * KNOWN WALLS (discovered during this experiment):
 *
 * WALL 1 – Massive API surface: 18+ namespaces × dozens of methods = hundreds
 *   of method signatures to proxy via MessagePort. Each call becomes
 *   postMessage → handler → postMessage round-trip adding latency.
 *
 * WALL 2 – Callback/event registration: Extensions register callbacks
 *   (e.g. registerCommand, onDidChangeConfiguration). The callback function
 *   lives in the worker but must be invoked from the main thread. Requires
 *   bidirectional async invocation over MessagePort.
 *
 * WALL 3 – Non-serializable objects: Extensions receive and return rich
 *   objects (Disposable, Uri, Provider, ContainerProviderConnection) with
 *   methods and internal state. MessagePort uses structured clone which
 *   strips methods and prototype chains.
 *
 * WALL 4 – require() and module cache: loadRuntime() uses require() and
 *   manipulates require.cache. Worker threads have their own module system
 *   so this cache cleanup logic becomes irrelevant but extension module
 *   resolution may differ.
 *
 * WALL 5 – Synchronous API assumptions: Some API methods are synchronous
 *   (e.g. Disposable.create, EventEmitter). Converting these to async
 *   message-based calls would break existing extension code.
 *
 * WALL 6 – Extension interdependencies via exports: activatedExtensions map
 *   stores exports that other extensions can access. In separate workers,
 *   these exports can't be shared directly.
 *
 * WALL 7 – Native modules (.node files): Some extensions use native addons
 *   that may not be safe to load in worker threads.
 */

import { Worker } from 'node:worker_threads';

import type { AnalyzedExtension } from './extension-analyzer.js';

/**
 * Manages a single extension running in a dedicated worker thread.
 * Each instance wraps one Worker and handles the message protocol.
 */
export class ExtensionWorkerHost {
  #worker: Worker | undefined;
  #callIdCounter = 0;
  #extensionId: string;

  // Registered callbacks from the worker (command handlers, event listeners, etc.)
  // Key: callback ID assigned in the worker, Value: the actual handler in main thread
  #registeredCallbacks = new Map<number, (...args: unknown[]) => unknown>();

  constructor(
    private readonly extension: AnalyzedExtension,
    private readonly apiHandler: ExtensionApiHandler,
  ) {
    this.#extensionId = extension.id;
  }

  async start(): Promise<unknown> {
    // WALL 4: We use the worker's own require() instead of the main process's.
    // This means require.cache cleanup in loadRuntime doesn't apply.
    this.#worker = new Worker(new URL('./extension-worker-runtime.js', import.meta.url), {
      workerData: {
        extensionId: this.#extensionId,
        extensionPath: this.extension.path,
        mainPath: this.extension.mainPath,
        storagePath: '', // would need real path
      },
    });

    return new Promise<unknown>((resolve, reject) => {
      this.#worker!.on('message', (msg: WorkerMessage) => {
        this.handleMessage(msg, resolve);
      });

      this.#worker!.on('error', err => {
        console.error(`Worker for extension ${this.#extensionId} error:`, err);
        reject(err);
      });

      this.#worker!.on('exit', code => {
        if (code !== 0) {
          console.error(`Worker for extension ${this.#extensionId} exited with code ${code}`);
        }
      });
    });
  }

  private handleMessage(msg: WorkerMessage, activateResolve: (value: unknown) => void): void {
    switch (msg.type) {
      case 'api-call': {
        // WALL 1: Every API call goes through this dispatch.
        // With 18+ namespaces and dozens of methods, this is a massive switch/map.
        this.handleApiCall(msg as ApiCallMessage).catch((err: unknown) =>
          console.error('API call handler error:', err),
        );
        break;
      }
      case 'activated': {
        activateResolve((msg as ActivatedMessage).exports);
        break;
      }
      case 'activation-error': {
        console.error(`Extension ${this.#extensionId} activation failed in worker`);
        break;
      }
    }
  }

  private async handleApiCall(msg: ApiCallMessage): Promise<void> {
    try {
      // WALL 2: For registerCommand, the callback lives in the worker.
      // We register a proxy that will postMessage back to the worker when invoked.
      // WALL 3: Arguments may contain non-serializable objects.
      const result = await this.apiHandler.handleCall(
        msg.namespace,
        msg.method,
        msg.args,
        this.#extensionId,
        // Callback proxy factory for WALL 2
        (callbackId: number): ((...args: unknown[]) => void) => {
          return (...args: unknown[]): void => {
            // WALL 3: args might not be serializable
            this.#worker?.postMessage({
              type: 'callback-invoke',
              callbackId,
              args,
            });
          };
        },
      );

      // WALL 3: result might contain non-serializable objects (Disposable, etc.)
      this.#worker?.postMessage({
        type: 'api-result',
        callId: msg.callId,
        result: this.serializeResult(result),
      });
    } catch (err) {
      this.#worker?.postMessage({
        type: 'api-error',
        callId: msg.callId,
        error: String(err),
      });
    }
  }

  // WALL 3: Attempt to serialize rich objects. This is where things break.
  private serializeResult(result: unknown): unknown {
    if (result === null || result === undefined) return result;
    if (typeof result !== 'object') return result;

    // Disposable objects have a dispose() method that must stay in main thread
    if (typeof (result as Record<string, unknown>)['dispose'] === 'function') {
      const disposableId = this.#callIdCounter++;
      // Store reference in main thread, send ID to worker
      this.#registeredCallbacks.set(disposableId, () => {
        (result as { dispose: () => void }).dispose();
      });
      return { __type: 'disposable', id: disposableId };
    }

    // For other objects, structured clone will strip methods — this is WALL 3
    try {
      return structuredClone(result);
    } catch {
      return { __type: 'unserializable', description: String(result) };
    }
  }

  async stop(): Promise<void> {
    if (this.#worker) {
      this.#worker.postMessage({ type: 'deactivate' });
      await this.#worker.terminate();
      this.#worker = undefined;
    }
  }
}

/**
 * Interface for the main-thread side that handles API calls from workers.
 * This is where the real registries live.
 */
export interface ExtensionApiHandler {
  handleCall(
    namespace: string,
    method: string,
    args: unknown[],
    extensionId: string,
    callbackProxyFactory: (callbackId: number) => (...args: unknown[]) => unknown,
  ): Promise<unknown>;
}

// Message types for the worker protocol
interface WorkerMessage {
  type: string;
}

interface ApiCallMessage extends WorkerMessage {
  type: 'api-call';
  callId: number;
  namespace: string;
  method: string;
  args: unknown[];
}

interface ActivatedMessage extends WorkerMessage {
  type: 'activated';
  exports: unknown;
}
