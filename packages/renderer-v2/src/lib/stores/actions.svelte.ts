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
import { SvelteMap } from 'svelte/reactivity';
import { toast } from 'svelte-sonner';

import type { ConfirmationsStore } from './confirmations.svelte.js';

/** An action on a resource, e.g. Stop or Delete. */
export interface ResourceAction {
  label: string;
  icon: LucideIcon;
  run: () => Promise<unknown> | void;
  disabled?: boolean;
  /** fills the icon, e.g. the square of Stop */
  filled?: boolean;
  /** destructive actions are red in the menus, and ask for a confirmation before running */
  destructive?: boolean;
  /** what happens to the resource while the action runs, shown on it: e.g. `stopping` */
  progress?: string;
  /** not shown on the resource, but known to the bulk actions: e.g. Start of a running container */
  hidden?: boolean;
  /**
   * the question asked before the action: a destructive action asks "<label> <name>" / "<name> will be permanently
   * removed" when not given
   */
  confirmation?: { title: string; message: string };
}

/** An action running on a resource. */
export interface PendingAction {
  label: string;
  progress?: string;
}

/** the key of a resource, for its actions: e.g. `container:podman.Podman:<id>` */
export function resourceKey(
  kind: 'container' | 'pod' | 'image' | 'volume' | 'network',
  engineId: string,
  id: string,
): string {
  return `${kind}:${engineId}:${id}`;
}

/** the key of the prune of a kind of resources on an engine: one prune at a time */
export function pruneKey(kind: 'containers' | 'pods' | 'images' | 'volumes', engineId: string): string {
  return `prune:${kind}:${engineId}`;
}

/** The actions of a resource, and the resource they apply to. */
export interface ResourceActionSet {
  target: ActionTarget;
  /** by priority: the first ones are shown as buttons */
  actions: ResourceAction[];
}

/** The resource an action applies to: identifies it, and names it in the messages. */
export interface ActionTarget {
  /** unique among the resources, e.g. `container:<engine>:<id>` */
  key: string;
  /** e.g. the name of the container */
  name: string;
}

/**
 * The message of an error coming from the main process, for the user: without the IPC wrapping
 * (`Error invoking remote method …: Error:`) and the HTTP wrapping of the engine (`(HTTP code 500) server error -`).
 */
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
    .replace(/^\(HTTP code \d+\) [^-]*- /, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** e.g. "a, b, c and 2 more" */
function listNames(names: string[]): string {
  if (names.length <= 3) {
    return names.join(', ');
  }
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
}

/**
 * Runs the actions on the resources: the destructive ones are confirmed first, one action at a time per resource
 * (the running one is pending), and the failures are reported in a toast (an action never fails silently).
 */
export class ActionsStore {
  readonly #confirmations: ConfirmationsStore;
  readonly #pending = new SvelteMap<string, PendingAction>();

  constructor(confirmations: ConfirmationsStore) {
    this.#confirmations = confirmations;
  }

  /** the action running on the resource, if any */
  pending(key: string): PendingAction | undefined {
    return this.#pending.get(key);
  }

  async run(target: ActionTarget, action: ResourceAction): Promise<void> {
    if (this.#pending.has(target.key)) {
      return;
    }
    if (action.destructive || action.confirmation) {
      const confirmed = await this.#confirmations.ask({
        title: action.confirmation?.title ?? `${action.label} ${target.name}`,
        message: action.confirmation?.message ?? `${target.name} will be permanently removed. This cannot be undone.`,
        confirmLabel: action.label,
        destructive: action.destructive,
      });
      if (!confirmed) {
        return;
      }
    }
    const error = await this.#runOne(target, action);
    if (error !== undefined) {
      toast.error(`${action.label} ${target.name} failed`, { description: errorMessage(error), duration: 8000 });
    }
  }

  /**
   * Runs an action on several resources (e.g. the selected rows): confirmed once when destructive, run at the same
   * time, the failures reported in one toast.
   * @param noun the resources, for the messages: e.g. `containers`
   * @returns false when nothing ran: nothing runnable, or the confirmation cancelled
   */
  async runAll(
    label: string,
    items: { target: ActionTarget; action: ResourceAction }[],
    noun: string,
  ): Promise<boolean> {
    const runnable = items.filter(item => !this.#pending.has(item.target.key));
    if (runnable.length === 0) {
      return false;
    }
    if (runnable.some(item => item.action.destructive)) {
      const confirmed = await this.#confirmations.ask({
        title: `${label} ${runnable.length} ${noun}`,
        message: `${listNames(runnable.map(item => item.target.name))} will be permanently removed. This cannot be undone.`,
        confirmLabel: label,
        destructive: true,
      });
      if (!confirmed) {
        return false;
      }
    }
    const errors = await Promise.all(runnable.map(item => this.#runOne(item.target, item.action)));
    const failed = runnable.flatMap((item, index) =>
      errors[index] === undefined ? [] : [{ item, error: errors[index] }],
    );
    if (failed.length === 1) {
      const [{ item, error }] = failed;
      toast.error(`${label} ${item.target.name} failed`, { description: errorMessage(error), duration: 8000 });
    } else if (failed.length > 1) {
      toast.error(`${label} failed for ${failed.length} of ${runnable.length} ${noun}`, {
        description: `${listNames(failed.map(({ item }) => item.target.name))}: ${errorMessage(failed[0].error)}`,
        duration: 8000,
      });
    }
    return true;
  }

  /** runs the action, the resource being pending meanwhile; @returns the error, if it failed */
  async #runOne(target: ActionTarget, action: ResourceAction): Promise<unknown> {
    // the confirmation is asynchronous: another action may have started meanwhile
    if (this.#pending.has(target.key)) {
      return undefined;
    }
    this.#pending.set(target.key, { label: action.label, progress: action.progress });
    try {
      await action.run();
      return undefined;
    } catch (error: unknown) {
      console.error(`Error running the action ${action.label} on ${target.key}`, error);
      return error ?? new Error('unknown error');
    } finally {
      this.#pending.delete(target.key);
    }
  }
}
