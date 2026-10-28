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

import type { ImageInfo } from '@desktop-framework/api';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import { renderComponent } from '@tanstack/svelte-table';

import NameCell from '#lib/components/data-table/cells/NameCell.svelte';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import { age, bytes } from '#lib/format.js';
import { shortId } from '#lib/stores/containers.svelte.js';
import { imageRepositoryAndTag } from '#lib/stores/images.svelte.js';

const column = columnHelper<ImageInfo>();

/** @param isUsed whether a container uses the image */
export function imageColumns(isUsed: (image: ImageInfo) => boolean): ReturnType<typeof column.columns> {
  return column.columns([
    column.accessor(image => imageRepositoryAndTag(image).repository, {
      id: 'name',
      header: 'Name',
      cell: ({ row, getValue }) => {
        const used = isUsed(row.original);
        return renderComponent(NameCell, {
          name: getValue(),
          status: used ? 'used' : 'unused',
          statusLabel: used ? 'In use' : 'Unused',
        });
      },
    }),
    column.accessor(image => imageRepositoryAndTag(image).tag, {
      id: 'tag',
      header: 'Tag',
      meta: { width: '10rem', class: 'text-muted-foreground' },
    }),
    column.accessor('Created', {
      header: 'Age',
      cell: ({ getValue }) => age(getValue()),
      sortFn: 'basic',
      meta: { width: '6rem', class: 'text-right text-muted-foreground' },
    }),
    column.accessor('Size', {
      header: 'Size',
      cell: ({ getValue }) => bytes(getValue()),
      sortFn: 'basic',
      meta: { width: '5.5rem', class: 'text-right tabular-nums text-muted-foreground' },
    }),
    column.accessor(image => shortId(image.Id), {
      id: 'id',
      header: 'ID',
      meta: { width: '8rem', class: 'text-right text-muted-foreground', cellClass: 'font-mono' },
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
              disabled: isUsed(row.original),
              run: (): Promise<void> => window.deleteImage(row.original.engineId, row.original.Id),
            },
          ],
        }),
      meta: { width: '5.5rem', actions: true },
    }),
  ]);
}
