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
import { toast } from 'svelte-sonner';

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

/** The resource an action applies to: identifies it, and names it in the messages. */
export interface ActionTarget {
  /** unique among the resources, e.g. `container:<engine>:<id>` */
  key: string;
  /** e.g. the name of the container */
  name: string;
}

/** the message of an error coming from the main process, without the IPC wrapping */
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

/**
 * Runs the actions on the resources, and reports their failures in a toast: an action never fails silently.
 */
export class ActionsStore {
  async run(target: ActionTarget, action: ResourceAction): Promise<void> {
    try {
      await action.run();
    } catch (error: unknown) {
      console.error(`Error running the action ${action.label} on ${target.key}`, error);
      toast.error(`${action.label} ${target.name} failed`, { description: errorMessage(error) });
    }
  }
}
