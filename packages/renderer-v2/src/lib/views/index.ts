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
import type { ParamsOf, StateOf, ViewDefinition, ViewSchema } from '#lib/workbench/define-view.js';

import buildOutput from './build-output/view.js';
import composeDetails from './compose-details/view.js';
import connection from './connection/view.js';
import connectionCreate from './connection-create/view.js';
import connectionLogs from './connection-logs/view.js';
import connectionTerminal from './connection-terminal/view.js';
import containerDetails from './container-details/view.js';
import containerLogs from './container-logs/view.js';
import containerTerminal from './container-terminal/view.js';
import containerTty from './container-tty/view.js';
import containers from './containers/view.js';
import creationOutput from './creation-output/view.js';
import dashboard from './dashboard/view.js';
import engine from './engine/view.js';
import imageBuild from './image-build/view.js';
import imageDetails from './image-details/view.js';
import imageFiles from './image-files/view.js';
import imageRun from './image-run/view.js';
import images from './images/view.js';
import kubePlay from './kube-play/view.js';
import networkDetails from './network-details/view.js';
import networks from './networks/view.js';
import podDetails from './pod-details/view.js';
import pods from './pods/view.js';
import secretDetails from './secret-details/view.js';
import secrets from './secrets/view.js';
import settings from './settings/view.js';
import tasks from './tasks/view.js';
import volumeDetails from './volume-details/view.js';
import volumes from './volumes/view.js';

/** Every view of the workbench, by id: one folder per view, declared with `defineView`. */
export const VIEWS = {
  dashboard,
  engine,
  connection,
  'connection-create': connectionCreate,
  'creation-output': creationOutput,
  'connection-terminal': connectionTerminal,
  'connection-logs': connectionLogs,
  containers,
  'compose-details': composeDetails,
  'container-details': containerDetails,
  'container-logs': containerLogs,
  'container-terminal': containerTerminal,
  'container-tty': containerTty,
  pods,
  'pod-details': podDetails,
  'kube-play': kubePlay,
  images,
  'image-details': imageDetails,
  'image-files': imageFiles,
  'image-build': imageBuild,
  'image-run': imageRun,
  'build-output': buildOutput,
  volumes,
  'volume-details': volumeDetails,
  networks,
  'network-details': networkDetails,
  secrets,
  'secret-details': secretDetails,
  settings,
  tasks,
} satisfies Record<string, ViewDefinition<ViewSchema>>;

type Views = typeof VIEWS;

export type ViewId = keyof Views;
export type ViewParams<Id extends ViewId> = ParamsOf<Views[Id]['schema']>;
export type ViewState<Id extends ViewId> = StateOf<Views[Id]['schema']>;

/** A reference to a view: what a tab shows. */
export type ViewRef<Id extends ViewId = ViewId> = { [K in Id]: { view: K; params: ViewParams<K> } }[Id];

export function viewRef<Id extends ViewId>(view: Id, params: ViewParams<Id>): ViewRef<Id> {
  return { view, params } as ViewRef<Id>;
}

/** the definition of a view, without the types of its own schemas (the workbench handles every view the same) */
export function viewDefinition(id: ViewId): ViewDefinition<ViewSchema> {
  return VIEWS[id] as unknown as ViewDefinition<ViewSchema>;
}

/**
 * Validates a reference (e.g. a navigation requested by the main process, a restored tab) and normalizes its
 * params: their order does not change the key of the view.
 * @throws if the view does not exist or if its params are invalid
 */
export function parseViewRef(ref: { view: string; params: unknown }): ViewRef {
  if (!Object.hasOwn(VIEWS, ref.view)) {
    throw new Error(`Unknown view ${ref.view}`);
  }
  const id = ref.view as ViewId;
  return { view: id, params: viewDefinition(id).schema.params.parse(ref.params) } as ViewRef;
}

/** the state of a view, with the defaults of its schema for what is not given */
export function viewState(ref: ViewRef, saved: unknown = {}): Record<string, unknown> {
  return viewDefinition(ref.view).schema.state.parse(saved);
}

/** the identity of a view: two references with the same key show the same thing */
export function viewKey(ref: ViewRef): string {
  const params = Object.entries(ref.params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`);
  return [ref.view, ...params].join('/');
}

/** The icon, the title and the context of a view, e.g. to show it in a tab. */
export function describeView(ref: ViewRef, app: App): { icon: LucideIcon; title: string; context?: string } {
  const definition = viewDefinition(ref.view);
  return {
    icon: definition.icon,
    title: definition.title(ref.params, app),
    context: definition.context?.(ref.params, app),
  };
}
