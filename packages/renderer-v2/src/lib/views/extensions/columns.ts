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

import type { ExtensionInfo } from '@desktop-framework/api';
import { renderComponent } from '@tanstack/svelte-table';

import type { App } from '#lib/app.svelte.js';
import { columnHelper } from '#lib/components/data-table/data-table.js';
import {
  catalogActions,
  extensionActions,
  extensionBadges,
  extensionKey,
  folderActions,
} from '#lib/components/extension/actions.js';
import ExtensionActions from '#lib/components/extension/ExtensionActions.svelte';
import ExtensionCell from '#lib/components/extension/ExtensionCell.svelte';
import type { CatalogEntry } from '#lib/stores/extensions.svelte.js';

const installed = columnHelper<ExtensionInfo>();

export function installedColumns(app: App): ReturnType<typeof installed.columns> {
  return installed.columns([
    // the filter also finds the description
    installed.accessor(extension => `${extension.displayName} ${extension.description}`, {
      id: 'name',
      header: 'Name',
      cell: ({ row }) =>
        renderComponent(ExtensionCell, {
          name: row.original.displayName,
          icon: row.original.icon,
          status: row.original.state,
          badges: extensionBadges(row.original),
          detail: row.original.description,
          actionKey: extensionKey(row.original.id),
        }),
    }),
    installed.accessor('version', {
      header: 'Version',
      cell: ({ row }) =>
        row.original.update ? `v${row.original.version} → v${row.original.update.version}` : `v${row.original.version}`,
      meta: { width: '8rem', class: 'text-muted-foreground' },
    }),
    installed.display({
      id: 'actions',
      cell: ({ row }) => renderComponent(ExtensionActions, { set: extensionActions(row.original, app) }),
      meta: { width: '5.5rem', actions: true },
    }),
  ]);
}

const catalog = columnHelper<CatalogEntry>();

export function catalogColumns(app: App): ReturnType<typeof catalog.columns> {
  return catalog.columns([
    // the filter also finds the description, the categories and the keywords
    catalog.accessor(
      entry => `${entry.displayName} ${entry.description} ${entry.categories.join(' ')} ${entry.keywords.join(' ')}`,
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const extension = app.extensions.get(row.original.id);
          return renderComponent(ExtensionCell, {
            name: row.original.displayName,
            icon: row.original.icon,
            status: extension?.state,
            badges: [...(row.original.featured ? ['Featured'] : []), ...(extension ? ['Installed'] : [])],
            detail: row.original.description,
            actionKey: extensionKey(row.original.id),
          });
        },
      },
    ),
    catalog.accessor('publisher', { header: 'Publisher', meta: { width: '10rem', class: 'text-muted-foreground' } }),
    catalog.accessor(entry => entry.version ?? '', {
      id: 'version',
      header: 'Version',
      cell: ({ getValue }) => (getValue() ? `v${getValue()}` : ''),
      meta: { width: '6rem', class: 'text-muted-foreground' },
    }),
    catalog.display({
      id: 'actions',
      cell: ({ row }) =>
        renderComponent(ExtensionActions, {
          set: catalogActions(row.original, !!app.extensions.get(row.original.id)),
        }),
      meta: { width: '5.5rem', actions: true },
    }),
  ]);
}

/** a tracked folder, and its extension once loaded */
export interface LocalFolder {
  path: string;
  extension?: ExtensionInfo;
}

const local = columnHelper<LocalFolder>();

export function localColumns(): ReturnType<typeof local.columns> {
  return local.columns([
    local.accessor(folder => `${folder.extension?.displayName ?? ''} ${folder.path}`, {
      id: 'name',
      header: 'Folder',
      cell: ({ row }) =>
        renderComponent(ExtensionCell, {
          name: row.original.extension?.displayName ?? row.original.path,
          icon: row.original.extension?.icon,
          status: row.original.extension?.state ?? 'unknown',
          detail: row.original.extension ? row.original.path : undefined,
          actionKey: folderActions(row.original.path, row.original.extension).target.key,
        }),
    }),
    local.display({
      id: 'actions',
      cell: ({ row }) =>
        renderComponent(ExtensionActions, { set: folderActions(row.original.path, row.original.extension) }),
      meta: { width: '5.5rem', actions: true },
    }),
  ]);
}
