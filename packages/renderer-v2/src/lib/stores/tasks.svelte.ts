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

import type { NotificationTaskInfo, TaskInfo } from '@desktop-framework/api';
import { toast } from 'svelte-sonner';

import { receive } from '#lib/api/events.js';
import type { ConfirmationsStore } from '#lib/stores/confirmations.svelte.js';

/** a notification task tells its failure in its body: it becomes the error of the task */
function normalize(task: TaskInfo | NotificationTaskInfo): TaskInfo {
  if ('body' in task && task.status === 'failure') {
    return { ...task, error: task.body };
  }
  return task;
}

/** the setting showing a toast for each task (experimental, off by default) */
const TOAST_SETTING = 'tasks.Toast';

/** shows the task in its toast, created with the task and updated with it */
function showToast(task: TaskInfo): void {
  const options = { id: task.id, description: task.error };
  if (task.state === 'running') {
    const progress = task.progress === undefined ? undefined : `${Math.round(task.progress)}%`;
    toast.loading(task.name, { ...options, description: progress, duration: Number.POSITIVE_INFINITY });
  } else if (task.status === 'success') {
    toast.success(task.name, options);
  } else if (task.status === 'failure') {
    toast.error(task.name, { ...options, duration: 8000 });
  } else {
    toast.info(task.name, { ...options, description: 'Canceled' });
  }
}

/**
 * The tasks of the main process and of the extensions (pulls, pushes, builds...), as they are created, updated
 * and removed: the main process sends them from its start, they cannot be listed.
 */
export class TasksStore {
  all: TaskInfo[] = $state.raw([]);
  /** each task shows in a toast (the setting of the toasts) */
  toasts = $state(false);
  readonly running: TaskInfo[] = $derived(this.all.filter(task => task.state === 'running'));

  readonly #confirmations: ConfirmationsStore;

  constructor(confirmations: ConfirmationsStore) {
    this.#confirmations = confirmations;
  }

  start(): () => void {
    window
      .getConfigurationValue<boolean>(TOAST_SETTING)
      .then(value => (this.toasts = !!value))
      .catch((error: unknown) => console.error('Error reading the setting of the task toasts', error));
    const stops = [
      receive<{ key: string; value: unknown }>('onDidChangeConfiguration', ({ key, value }) => {
        if (key === TOAST_SETTING) {
          this.toasts = !!value;
        }
      }),
      receive<TaskInfo>('task-created', task => {
        this.all = [...this.all, normalize(task)];
        if (this.toasts) {
          showToast(normalize(task));
        }
      }),
      receive<TaskInfo>('task-updated', task => {
        this.all = this.all.map(current => (current.id === task.id ? normalize(task) : current));
        if (this.toasts) {
          showToast(normalize(task));
        }
      }),
      receive<TaskInfo>('task-removed', task => {
        this.all = this.all.filter(current => current.id !== task.id);
        toast.dismiss(task.id);
      }),
    ];
    return (): void => stops.forEach(stop => stop());
  }

  /** runs the action of the task, e.g. opening the image it pulled */
  view(task: TaskInfo): void {
    window
      .executeTask(task.id)
      .catch((error: unknown) => console.error(`Error running the action of ${task.name}`, error));
  }

  /** cancels a running task, after a confirmation */
  async cancel(task: TaskInfo): Promise<void> {
    if (!task.cancellable || task.cancellationTokenSourceId === undefined) {
      return;
    }
    const confirmed = await this.#confirmations.ask({
      title: `Cancel ${task.name}`,
      message: `${task.name} will be stopped.`,
      confirmLabel: 'Cancel the task',
      destructive: true,
    });
    if (confirmed) {
      await window.cancelToken(task.cancellationTokenSourceId);
    }
  }

  /** removes a completed task from the list */
  clear(task: TaskInfo): void {
    window.clearTask(task.id).catch((error: unknown) => console.error(`Error clearing ${task.name}`, error));
  }

  /** removes the completed tasks from the list */
  clearCompleted(): void {
    window.clearTasks().catch((error: unknown) => console.error('Error clearing the tasks', error));
  }
}
