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

import type { VolumeInfo } from '@desktop-framework/api';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import { renderComponent } from '@tanstack/svelte-table';

import NameCell from '#lib/components/data-table/cells/NameCell.svelte';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import { age } from '#lib/format.js';

const column = columnHelper<VolumeInfo>();

export const volumeColumns = column.columns([
  column.accessor('Name', {
    header: 'Name',
    cell: ({ row }) => {
      const users = row.original.containersUsage?.length ?? 0;
      return renderComponent(NameCell, {
        name: row.original.Name,
        status: users ? 'used' : 'unused',
        statusLabel: users ? `Used by ${users} container${users > 1 ? 's' : ''}` : 'Unused',
      });
    },
  }),
  column.accessor('Driver', { header: 'Driver', meta: { width: '6rem', class: 'text-muted-foreground' } }),
  column.accessor('CreatedAt', {
    header: 'Age',
    cell: ({ getValue }) => age(getValue()),
    sortFn: 'datetime',
    meta: { width: '6rem', class: 'text-right text-muted-foreground' },
  }),
  column.display({
    id: 'actions',
    cell: ({ row }) =>
      renderComponent(ResourceActions, {
        max: 3,
        actions: [
          {
            label: 'Delete',
            icon: Trash2Icon,
            destructive: true,
            disabled: !!row.original.containersUsage?.length,
            run: (): Promise<void> => window.removeVolume(row.original.engineId, row.original.Name),
          },
        ],
      }),
    meta: { width: '5.5rem', actions: true },
  }),
]);
