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

import type { NetworkInspectInfo } from '@desktop-framework/api';
import { renderComponent } from '@tanstack/svelte-table';

import NameCell from '#lib/components/data-table/cells/NameCell.svelte';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import NetworkActions from '#lib/components/network/NetworkActions.svelte';
import { shortId } from '#lib/stores/containers.svelte.js';

const column = columnHelper<NetworkInspectInfo>();

export const networkColumns = column.columns([
  column.accessor('Name', {
    header: 'Name',
    cell: ({ row }) => {
      const users = Object.keys(row.original.Containers ?? {}).length;
      return renderComponent(NameCell, {
        name: row.original.Name,
        status: users ? 'used' : 'unused',
        statusLabel: users ? `Used by ${users} container${users > 1 ? 's' : ''}` : 'Unused',
      });
    },
  }),
  column.accessor('Driver', { header: 'Driver', meta: { width: '6rem', class: 'text-muted-foreground' } }),
  column.accessor(network => shortId(network.Id), {
    id: 'id',
    header: 'ID',
    meta: { width: '8rem', class: 'text-right text-muted-foreground', cellClass: 'font-mono' },
  }),
  column.display({
    id: 'actions',
    cell: ({ row }) => renderComponent(NetworkActions, { network: row.original }),
    meta: { width: '5.5rem', actions: true },
  }),
]);
