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
import { renderComponent } from '@tanstack/svelte-table';

import NameCell from '#lib/components/data-table/cells/NameCell.svelte';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import ImageActions from '#lib/components/image/ImageActions.svelte';
import { age, bytes } from '#lib/format.js';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import { shortId } from '#lib/stores/containers.svelte.js';
import { imageRepositoryAndTag } from '#lib/stores/images.svelte.js';

const column = columnHelper<ImageInfo>();

/**
 * @param isUsed whether a container uses the image (for a manifest: one of its images)
 * @param manifestOf the manifest listing the image, if any
 */
export function imageColumns(
  isUsed: (image: ImageInfo) => boolean,
  manifestOf: (image: ImageInfo) => ImageInfo | undefined,
): ReturnType<typeof column.columns> {
  return column.columns([
    // an image of a manifest matches the name of the manifest too
    column.accessor(
      image => {
        const manifest = manifestOf(image);
        const { repository } = imageRepositoryAndTag(image);
        return manifest ? `${repository} ${imageRepositoryAndTag(manifest).repository}` : repository;
      },
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const used = isUsed(row.original);
          // the images it lists, not only the ones matching the filter
          const images = row.original.manifests?.length ?? 0;
          return renderComponent(NameCell, {
            name: imageRepositoryAndTag(row.original).repository,
            actionKey: resourceKey('image', row.original.engineId, row.original.Id),
            status: used ? 'used' : 'unused',
            statusLabel: used ? 'In use' : 'Unused',
            detail: row.original.isManifest ? `Manifest · ${images} image${images === 1 ? '' : 's'}` : undefined,
            depth: row.depth,
            expanded: row.getIsExpanded(),
            onToggle: row.getCanExpand() ? row.getToggleExpandedHandler() : undefined,
          });
        },
      },
    ),
    column.accessor(image => imageRepositoryAndTag(image).tag, {
      id: 'tag',
      header: 'Tag',
      meta: { width: '10rem', class: 'text-muted-foreground' },
    }),
    column.accessor(image => image.Arch ?? '', {
      id: 'arch',
      header: 'Arch',
      meta: { width: '5.5rem', class: 'text-muted-foreground' },
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
      cell: ({ row }) => renderComponent(ImageActions, { image: row.original, used: isUsed(row.original) }),
      meta: { width: '5.5rem', actions: true },
    }),
  ]);
}
