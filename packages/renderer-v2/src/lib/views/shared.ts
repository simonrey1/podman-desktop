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

/** Helpers shared by the definitions of the views (not a view). */

export const engineParams = z.object({ engineId: z.string() });

export const containerParams = z.object({ engineId: z.string(), containerId: z.string() });

/** the sort of a table, as TanStack Table describes it */
export const sortSchema = z.array(z.object({ id: z.string(), desc: z.boolean() }));

/** the state of the views listing resources */
export const listState = z.object({
  filter: z.string().default(''),
  sort: sortSchema.default([]),
});

export const noState = z.object({});

export function engineName(params: { engineId: string }, app: App): string {
  return app.engines.get(params.engineId)?.name ?? params.engineId;
}

export function containerTitle(params: { engineId: string; containerId: string }, app: App): string {
  const container = app.containers.get(params.engineId, params.containerId);
  return container ? containerName(container) : shortId(params.containerId);
}
