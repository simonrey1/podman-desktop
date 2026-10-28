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
import type { Component } from 'svelte';
import type { z } from 'zod';

import type { App } from '#lib/app.svelte.js';

import type { ViewHandle } from './view-handle.js';

/**
 * The schemas of a view: its params (what it shows, the identity of its tab) and its state (how it shows it:
 * filter, sort, selected section...). The state is kept with the tab, its defaults come from the schema.
 */
export interface ViewSchema {
  params: z.ZodType<Record<string, unknown>>;
  state: z.ZodType<Record<string, unknown>>;
}

export type ParamsOf<S extends ViewSchema> = z.output<S['params']>;
export type StateOf<S extends ViewSchema> = z.output<S['state']>;

/** The props of the component of a view: `let { view }: ViewProps<typeof schema> = $props();` */
export interface ViewProps<S extends ViewSchema> {
  view: ViewHandle<ParamsOf<S>, StateOf<S>>;
}

/** Where a view opens by default. */
export type ViewLocation = 'editor' | 'panel';

export interface ViewDefinition<S extends ViewSchema = ViewSchema> {
  schema: S;
  icon: LucideIcon;
  title: (params: ParamsOf<S>, app: App) => string;
  /** where the view belongs, e.g. its engine: shown in the tab tooltip and in the status bar */
  context?: (params: ParamsOf<S>, app: App) => string | undefined;
  location: ViewLocation;
  /** the view stays mounted when its tab is not active, e.g. a terminal keeps its session */
  keepAlive?: boolean;
  /**
   * single (default): a view is shown once per tab group, opening it again focuses its tab;
   * multiple: each opening is a new instance in its own tab, even with the same params (e.g. each click on
   * Terminal opens another shell). The view itself does not know: each instance manages only itself.
   */
  instances?: 'single' | 'multiple';
  /** the component, loaded the first time the view is shown */
  component: () => Promise<{ default: Component<ViewProps<S>> }>;
}

/** Declares a view: its schemas, how it is presented, and its component. */
export function defineView<S extends ViewSchema>(definition: ViewDefinition<S>): ViewDefinition<S> {
  return definition;
}
