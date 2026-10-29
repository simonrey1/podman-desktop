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

import { renderComponent } from '@tanstack/svelte-table';

import NameCell from '#lib/components/data-table/cells/NameCell.svelte';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import { age } from '#lib/format.js';

import type { ContainerRow } from './rows.js';

const column = columnHelper<ContainerRow>();

export const containerColumns = column.columns([
  // a container of a group matches the name of the group too
  column.accessor(row => (row.group ? `${row.name} ${row.group}` : row.name), {
    id: 'name',
    header: 'Name',
    cell: ({ row }) =>
      renderComponent(NameCell, {
        name: row.original.name,
        actionKey: row.original.actions.target.key,
        status: row.original.status,
        detail: row.original.detail,
        depth: row.depth,
        expanded: row.getIsExpanded(),
        onToggle: row.getCanExpand() ? row.getToggleExpandedHandler() : undefined,
      }),
  }),
  column.accessor(row => row.image ?? '', {
    id: 'image',
    header: 'Image',
    meta: { width: '18rem', class: 'text-right text-muted-foreground' },
  }),
  // how long a running container has been running (empty when stopped, sorted before the shortest uptime)
  column.accessor(row => (row.startedAt ? Date.now() - new Date(row.startedAt).getTime() : -1), {
    id: 'uptime',
    header: 'Uptime',
    cell: ({ row }) => (row.original.startedAt ? age(row.original.startedAt) : ''),
    sortFn: 'basic',
    meta: { width: '6rem', class: 'text-right text-muted-foreground' },
  }),
  column.accessor('created', {
    header: 'Age',
    cell: ({ getValue }) => age(getValue()),
    sortFn: 'basic',
    meta: { width: '6rem', class: 'text-right text-muted-foreground' },
  }),
  column.display({
    id: 'actions',
    cell: ({ row }) =>
      renderComponent(ResourceActions, {
        target: row.original.actions.target,
        actions: row.original.actions.actions,
        max: 3,
      }),
    meta: { width: '5.5rem', actions: true },
  }),
]);
