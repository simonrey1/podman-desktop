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

import type { PodInfo } from '@desktop-framework/api';
import { renderComponent } from '@tanstack/svelte-table';

import NameCell from '#lib/components/data-table/cells/NameCell.svelte';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import PodActions from '#lib/components/pod/PodActions.svelte';
import { age } from '#lib/format.js';

const column = columnHelper<PodInfo>();

export const podColumns = column.columns([
  column.accessor('Name', {
    header: 'Name',
    cell: ({ row }) => renderComponent(NameCell, { name: row.original.Name, status: row.original.Status }),
  }),
  column.accessor(pod => pod.Containers.length, {
    id: 'containers',
    header: 'Containers',
    sortFn: 'basic',
    meta: { width: '7rem', class: 'text-right tabular-nums text-muted-foreground' },
  }),
  column.accessor('Created', {
    header: 'Age',
    cell: ({ getValue }) => age(getValue()),
    sortFn: 'datetime',
    meta: { width: '6rem', class: 'text-right text-muted-foreground' },
  }),
  column.display({
    id: 'actions',
    cell: ({ row }) => renderComponent(PodActions, { pod: row.original }),
    meta: { width: '5.5rem', actions: true },
  }),
]);
