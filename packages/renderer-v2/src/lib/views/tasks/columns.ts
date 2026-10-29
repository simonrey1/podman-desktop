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

import type { TaskInfo } from '@desktop-framework/api';
import { renderComponent } from '@tanstack/svelte-table';

import { columnHelper } from '#lib/components/data-table/data-table.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import { age } from '#lib/format.js';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';

import TaskProgressCell from './TaskProgressCell.svelte';
import TaskStatusCell from './TaskStatusCell.svelte';

const column = columnHelper<TaskInfo>();

/** @param actionsOf the actions of a task: view, cancel, clear */
export function taskColumns(actionsOf: (task: TaskInfo) => ResourceActionSet): ReturnType<typeof column.columns> {
  return column.columns([
    column.accessor('name', {
      header: 'Name',
      cell: ({ row }) => renderComponent(TaskStatusCell, { task: row.original }),
    }),
    column.accessor('status', {
      header: 'Progress',
      cell: ({ row }) => renderComponent(TaskProgressCell, { task: row.original }),
      meta: { width: '10rem', class: 'text-muted-foreground' },
    }),
    column.accessor('started', {
      header: 'Started',
      cell: ({ getValue }) => `${age(new Date(getValue()))} ago`,
      sortFn: 'basic',
      meta: { width: '7rem', class: 'text-right text-muted-foreground' },
    }),
    column.display({
      id: 'actions',
      cell: ({ row }) => {
        const set = actionsOf(row.original);
        return renderComponent(ResourceActions, { target: set.target, actions: set.actions, max: 3 });
      },
      meta: { width: '5.5rem', actions: true },
    }),
  ]);
}
