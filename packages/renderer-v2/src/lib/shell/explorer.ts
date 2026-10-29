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

import type { LucideIcon } from '@lucide/svelte';

import type { App } from '#lib/app.svelte.js';
import { describeView, type ViewRef, viewRef } from '#lib/views/index.js';

/** An entry of the explorer: a view of the engine, with the number of resources it lists. */
export interface ExplorerEntry {
  id: string;
  ref: ViewRef;
  label: string;
  icon: LucideIcon;
  count?: number;
}

/** The explorer of an engine: its overview, then its resources by kind. */
export function explorerEntries(app: App, engineId: string): ExplorerEntry[] {
  const entry = (ref: ViewRef, count?: number): ExplorerEntry => {
    const view = describeView(ref, app);
    return { id: ref.view, ref, label: view.title, icon: view.icon, count };
  };
  return [
    { ...entry(viewRef('engine', { engineId })), label: 'Overview' },
    entry(viewRef('containers', { engineId }), app.containers.ofEngine(engineId).length),
    entry(viewRef('pods', { engineId }), app.pods.ofEngine(engineId).length),
    entry(viewRef('images', { engineId }), app.images.ofEngine(engineId).length),
    entry(viewRef('volumes', { engineId }), app.volumes.ofEngine(engineId).length),
    entry(viewRef('networks', { engineId }), app.networks.ofEngine(engineId).length),
    entry(viewRef('secrets', { engineId }), app.secrets.ofEngine(engineId).length),
  ];
}
