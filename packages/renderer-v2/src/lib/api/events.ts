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
 * Subscribe to events sent by the main process on the api-sender channel (window.events).
 * @returns a function removing the listeners
 */
export function subscribe(channels: readonly string[], listener: () => void): () => void {
  const disposables = channels.map(channel => window.events.receive(channel, listener));
  return (): void => {
    for (const disposable of disposables) {
      disposable.dispose();
    }
  };
}

/**
 * Receives the data of an event sent by the main process (e.g. a dialog to show).
 * @returns a function removing the listener
 */
export function receive<T>(channel: string, listener: (data: T) => void): () => void {
  const disposable = window.events.receive(channel, (data: unknown) => listener(data as T));
  return (): void => disposable.dispose();
}

/**
 * Resolves once the extensions are started: until then the providers (and their resources) are not registered.
 */
export function whenExtensionsStarted(): Promise<void> {
  return new Promise(resolve => {
    // subscribe before asking, so the event cannot be missed in between
    const unsubscribe = subscribe(['extensions-started'], () => {
      unsubscribe();
      resolve();
    });
    window
      .extensionSystemIsExtensionsStarted()
      .then(started => {
        if (started) {
          unsubscribe();
          resolve();
        }
      })
      .catch((error: unknown) => console.error('Error checking if the extensions are started', error));
  });
}
