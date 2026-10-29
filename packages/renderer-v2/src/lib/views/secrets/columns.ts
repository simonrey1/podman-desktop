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

import type { SecretInfo } from '@desktop-framework/api';
import { renderComponent } from '@tanstack/svelte-table';

import NameCell from '#lib/components/data-table/cells/NameCell.svelte';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import SecretActions from '#lib/components/secret/SecretActions.svelte';
import { age } from '#lib/format.js';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import { shortId } from '#lib/stores/containers.svelte.js';

const column = columnHelper<SecretInfo>();

export const secretColumns = column.columns([
  column.accessor('Name', {
    header: 'Name',
    cell: ({ row }) =>
      renderComponent(NameCell, {
        name: row.original.Name,
        actionKey: resourceKey('secret', row.original.engineId, row.original.Id),
        // the engines do not tell which containers use a secret
        status: 'created',
        statusLabel: 'Secret',
      }),
  }),
  column.accessor(secret => shortId(secret.Id), {
    id: 'id',
    header: 'ID',
    meta: { width: '8rem', class: 'text-right text-muted-foreground', cellClass: 'font-mono' },
  }),
  column.accessor(secret => secret.CreatedAt ?? '', {
    id: 'created',
    header: 'Age',
    cell: ({ getValue }) => (getValue() ? age(getValue()) : ''),
    sortFn: 'datetime',
    meta: { width: '6rem', class: 'text-right text-muted-foreground' },
  }),
  column.display({
    id: 'actions',
    cell: ({ row }) => renderComponent(SecretActions, { secret: row.original }),
    meta: { width: '5.5rem', actions: true },
  }),
]);
