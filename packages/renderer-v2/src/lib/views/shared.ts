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

import { z } from 'zod';

import type { App } from '#lib/app.svelte.js';
import { containerName, shortId } from '#lib/stores/containers.svelte.js';
import { imageName } from '#lib/stores/images.svelte.js';

/** Helpers shared by the definitions of the views (not a view). */

export const engineParams = z.object({ engineId: z.string() });

export const containerParams = z.object({ engineId: z.string(), containerId: z.string() });

export const podParams = z.object({ engineId: z.string(), podId: z.string() });

export const imageParams = z.object({ engineId: z.string(), imageId: z.string() });

export const volumeParams = z.object({ engineId: z.string(), volumeName: z.string() });

export const secretParams = z.object({ engineId: z.string(), secretId: z.string() });

export const networkParams = z.object({ engineId: z.string(), networkId: z.string() });

/** the sort of a table, as TanStack Table describes it */
export const sortSchema = z.array(z.object({ id: z.string(), desc: z.boolean() }));

/** the resources shown by a list: all of them, the running ones, or the others */
export const showSchema = z.enum(['all', 'running', 'stopped']).default('all');

export function isShown(show: z.infer<typeof showSchema>, running: boolean): boolean {
  return show === 'all' || (show === 'running') === running;
}

/** the groups of a table expanded (true) or collapsed (false), by id: expanded when not listed */
export const expandedSchema = z.record(z.string(), z.boolean());

/** the selected rows of a table, by id */
export const selectionSchema = z.record(z.string(), z.literal(true));

/** the state of the views listing resources */
export const listState = z.object({
  filter: z.string().default(''),
  sort: sortSchema.default([]),
  selection: selectionSchema.default({}),
});

export const noState = z.object({});

export function engineName(params: { engineId: string }, app: App): string {
  return app.engines.get(params.engineId)?.name ?? params.engineId;
}

export function containerTitle(params: { engineId: string; containerId: string }, app: App): string {
  const container = app.containers.get(params.engineId, params.containerId);
  return container ? containerName(container) : shortId(params.containerId);
}

export function podTitle(params: { engineId: string; podId: string }, app: App): string {
  return app.pods.get(params.engineId, params.podId)?.Name ?? shortId(params.podId);
}

export function imageTitle(params: { engineId: string; imageId: string }, app: App): string {
  const image = app.images.get(params.engineId, params.imageId);
  return image ? imageName(image) : shortId(params.imageId);
}

export function networkTitle(params: { engineId: string; networkId: string }, app: App): string {
  return app.networks.get(params.engineId, params.networkId)?.Name ?? shortId(params.networkId);
}

export function secretTitle(params: { engineId: string; secretId: string }, app: App): string {
  return app.secrets.get(params.engineId, params.secretId)?.Name ?? shortId(params.secretId);
}

/** the status of a group: running when all its containers run, degraded when some do, exited else */
export function groupStatus(running: number, total: number): string {
  if (running === total) {
    return 'running';
  }
  return running ? 'degraded' : 'exited';
}
