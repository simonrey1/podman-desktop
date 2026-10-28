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

import type { Component } from 'svelte';

import { viewDefinition, type ViewId } from '#lib/views/index.js';

import type { ViewHandle } from './view-handle.js';

/** What the workbench gives to any view: the handle typed for one view is checked by `defineView`. */
export type AnyViewComponent = Component<{ view: ViewHandle<unknown, unknown> }>;

// not reactive: a cache of the loaded components, shared by every tab group
const components = new Map<ViewId, Promise<AnyViewComponent>>();

/** Loads the component of a view the first time it is shown, then reuses it. */
export function loadViewComponent(id: ViewId): Promise<AnyViewComponent> {
  let component = components.get(id);
  if (!component) {
    component = viewDefinition(id)
      .component()
      .then(module => module.default as unknown as AnyViewComponent);
    components.set(id, component);
  }
  return component;
}
