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

import type { ContainerInfo } from '@desktop-framework/api';
import { renderComponent } from '@tanstack/svelte-table';

import ContainerActions from '#lib/components/container/ContainerActions.svelte';
import NameCell from '#lib/components/data-table/cells/NameCell.svelte';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import { age } from '#lib/format.js';
import { containerName, containerPorts } from '#lib/stores/containers.svelte.js';

const column = columnHelper<ContainerInfo>();

export const containerColumns = column.columns([
  column.accessor(containerName, {
    id: 'name',
    header: 'Name',
    cell: ({ row }) =>
      renderComponent(NameCell, {
        name: containerName(row.original),
        status: row.original.State,
        detail: containerPorts(row.original),
      }),
  }),
  column.accessor('Image', { header: 'Image', meta: { width: '18rem', class: 'text-right text-muted-foreground' } }),
  column.accessor('Created', {
    header: 'Age',
    cell: ({ getValue }) => age(getValue()),
    sortFn: 'basic',
    meta: { width: '6rem', class: 'text-right text-muted-foreground' },
  }),
  column.display({
    id: 'actions',
    cell: ({ row }) => renderComponent(ContainerActions, { container: row.original }),
    meta: { width: '5.5rem', actions: true },
  }),
]);
