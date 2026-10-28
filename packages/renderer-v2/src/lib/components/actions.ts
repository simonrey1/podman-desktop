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

/** An action on a resource, e.g. Stop or Delete. */
export interface ResourceAction {
  label: string;
  icon: LucideIcon;
  run: () => Promise<unknown> | void;
  disabled?: boolean;
  /** fills the icon, e.g. the square of Stop */
  filled?: boolean;
  /** destructive actions are red in the menus */
  destructive?: boolean;
}

/** runs an action, logging its failure */
export function runAction(action: ResourceAction): void {
  Promise.resolve()
    .then(() => action.run())
    .catch((error: unknown) => console.error(`Error running the action ${action.label}`, error));
}
