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
 * EXPERIMENTAL – Worker thread runtime for extensions.
 *
 * This runs inside a Worker thread. It:
 * 1. Loads the extension module via require()
 * 2. Creates a proxy API object that forwards calls to the main thread
 * 3. Calls the extension's activate() with the proxy API
 *
 * WALL 5 is most visible here: many API objects that extensions expect
 * to be synchronous must become async message-based proxies.
 */

import { parentPort, workerData } from 'node:worker_threads';

interface PendingApiCall {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

const pendingCalls = new Map<number, PendingApiCall>();
let callIdCounter = 0;
const registeredCallbacks = new Map<number, (...args: unknown[]) => unknown>();
let callbackIdCounter = 0;

if (!parentPort) {
  throw new Error('This file must be run as a worker thread');
}

const port = parentPort;

port.on('message', (msg: { type: string; [key: string]: unknown }) => {
  switch (msg.type) {
    case 'api-result': {
      const pending = pendingCalls.get(msg['callId'] as number);
      if (pending) {
        pendingCalls.delete(msg['callId'] as number);
        pending.resolve(msg['result']);
      }
      break;
    }
    case 'api-error': {
      const pending = pendingCalls.get(msg['callId'] as number);
      if (pending) {
        pendingCalls.delete(msg['callId'] as number);
        pending.reject(new Error(msg['error'] as string));
      }
      break;
    }
    case 'callback-invoke': {
      const cb = registeredCallbacks.get(msg['callbackId'] as number);
      if (cb) {
        cb(...(msg['args'] as unknown[]));
      }
      break;
    }
    case 'deactivate': {
      // Call deactivate on the extension if available
      break;
    }
  }
});

/**
 * Create a proxy that intercepts property access and method calls,
 * forwarding them to the main thread via postMessage.
 *
 * WALL 5: This makes ALL API calls async. Extensions that do:
 *   const disposable = commands.registerCommand('foo', handler);
 *   disposable.dispose(); // synchronous in current code
 * would need to change to:
 *   const disposable = await commands.registerCommand('foo', handler);
 *   await disposable.dispose(); // now async
 */
function createApiProxy(namespace: string): Record<string, (...args: unknown[]) => Promise<unknown>> {
  return new Proxy(
    {},
    {
      get(_target, method: string) {
        return (...args: unknown[]) => {
          const callId = callIdCounter++;

          // WALL 2: Detect callback arguments and register them locally,
          // sending callback IDs to the main thread instead of functions
          const serializedArgs = args.map(arg => {
            if (typeof arg === 'function') {
              const cbId = callbackIdCounter++;
              registeredCallbacks.set(cbId, arg as (...a: unknown[]) => unknown);
              return { __type: 'callback', callbackId: cbId };
            }
            return arg;
          });

          return new Promise((resolve, reject) => {
            pendingCalls.set(callId, { resolve, reject });
            port.postMessage({
              type: 'api-call',
              callId,
              namespace,
              method,
              args: serializedArgs,
            });
          });
        };
      },
    },
  );
}

// WALL 1: We need to proxy every namespace. This is 18+ proxy objects.
const API_NAMESPACES = [
  'commands',
  'provider',
  'proxy',
  'tray',
  'configuration',
  'registry',
  'window',
  'fs',
  'kubernetes',
  'containerEngine',
  'authentication',
  'extensions',
  'env',
  'process',
  'context',
  'cli',
  'imageChecker',
  'navigation',
  'net',
] as const;

// Build the fake containerDesktopAPI that the extension will import
const apiProxy: Record<string, unknown> = {};
for (const ns of API_NAMESPACES) {
  apiProxy[ns] = createApiProxy(ns);
}

// WALL 5: These are synchronous constructors/classes that extensions
// can call directly. They cannot be proxied over MessagePort.
// We'd need to bundle real implementations here or polyfill them.
//
// apiProxy.Disposable = ???  // needs Disposable class
// apiProxy.Uri = ???         // needs Uri class
// apiProxy.EventEmitter = ???  // needs EventEmitter class
// apiProxy.CancellationTokenSource = ???  // needs CancellationTokenSource

/**
 * WALL 4: In the main thread, extensions are loaded via require() and
 * the module is shimmed so that `require('@podman-desktop/api')` returns
 * the real API object. Here we need the same shim but for the worker's
 * require/import system.
 */
async function loadAndActivate(): Promise<void> {
  const { mainPath, storagePath, extensionId } = workerData;

  if (!mainPath) {
    port.postMessage({ type: 'activated', exports: undefined });
    return;
  }

  try {
    // WALL 4: We need to intercept require('@podman-desktop/api') in the worker.
    // In the main thread this is done via Module._resolveFilename hook.
    // In worker threads, the same hook should work but needs testing.
    const Module = require('node:module');
    const originalResolve = Module._resolveFilename;
    Module._resolveFilename = function (
      request: string,
      parent: NodeJS.Module | undefined,
      isMain: boolean,
      options: object,
    ): string {
      if (request === '@podman-desktop/api') {
        // Return a marker — we'll intercept the actual require below
        return '__podman_desktop_api__';
      }
      return originalResolve.call(this, request, parent, isMain, options);
    };

    // Hook require to return our proxy for the API
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function (id: string): unknown {
      if (id === '__podman_desktop_api__' || id === '@podman-desktop/api') {
        return apiProxy;
      }
      return originalRequire.call(this, id);
    };

    // Load the extension
    const extensionModule = require(mainPath);

    const extensionContext = {
      subscriptions: [] as unknown[],
      storagePath,
      extensionUri: { fsPath: workerData.extensionPath, scheme: 'file' },
      secrets: createApiProxy('secrets'),
    };

    let exports: unknown;
    if (typeof extensionModule?.activate === 'function') {
      exports = await extensionModule.activate(extensionContext);
    }

    port.postMessage({ type: 'activated', exports });
  } catch (err) {
    console.error(`Worker activation failed for ${extensionId}:`, err);
    port.postMessage({ type: 'activation-error', error: String(err) });
  }
}

loadAndActivate().catch((err: unknown) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});
