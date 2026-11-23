/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
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
 * The Podman Desktop Webview API provides a way to interact with Podman Desktop from webviews
 *
 * @example
 * ```typescript
 * import * as webviewApi from '@podman-desktop/webview-api';
 *
 * ```
 *
 * @module @podman-desktop/webview-api
 **/

declare module '@podman-desktop/webview-api' {
  export interface WebviewApi {
    getState(): unknown;
    postMessage(msg: unknown): void;
    setState(newState: unknown): Promise<void>;
    history: WebviewHistoryApi;
  }

  export interface WebviewHistoryEntry {
    /**
     * Opaque identifier (e.g. the route of the webview), given back to
     * {@link WebviewHistoryApi.onDidNavigate} listeners.
     */
    id: string;
    /**
     * Label displayed in the history dropdown.
     */
    label: string;
  }

  export interface WebviewHistoryNavigateEvent {
    id: string;
  }

  /**
   * Integrates the webview pages in Podman Desktop's global back/forward history.
   *
   * @example
   * ```typescript
   * const api = acquirePodmanDesktopApi();
   * // on every route change
   * api.history.push({ id: '/details/foo', label: 'Foo' });
   * // when the user navigates back/forward to one of the entries
   * api.history.onDidNavigate(({ id }) => router.goto(id));
   * ```
   */
  export interface WebviewHistoryApi {
    /**
     * Push an entry in the history. Pushing the current entry again is a no-op,
     * so it is safe to call it on every route change (including the ones
     * triggered by {@link WebviewHistoryApi.onDidNavigate}).
     */
    push(entry: WebviewHistoryEntry): void;
    /**
     * Called when the user navigates back/forward to an entry of this webview.
     * If the webview was not displayed, Podman Desktop opens it and calls the
     * listener once it is registered.
     */
    onDidNavigate(listener: (event: WebviewHistoryNavigateEvent) => void): { dispose(): void };
  }
}
