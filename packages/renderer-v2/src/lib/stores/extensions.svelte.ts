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

import type { ExtensionDevelopmentFolderInfo, ExtensionInfo } from '@desktop-framework/api';
import type { CatalogExtension } from '@desktop-framework/api/extension-catalog';

import { ListState } from '#lib/stores/list.svelte.js';

/** The extensions installed (bundled, by the user, or from a development folder), by their name. */
export class ExtensionsStore extends ListState<ExtensionInfo> {
  constructor() {
    super(
      async () => (await window.listExtensions()).toSorted((a, b) => a.displayName.localeCompare(b.displayName)),
      [
        'extension-starting',
        'extension-started',
        'extension-stopping',
        'extension-stopped',
        'extension-removed',
        'extensions-started',
        'extensions-updated',
      ],
    );
  }

  get(id: string): ExtensionInfo | undefined {
    return this.items.find(extension => extension.id === id);
  }
}

/** An extension of the catalog, at its last version which is not a preview. */
export interface CatalogEntry {
  id: string;
  displayName: string;
  description: string;
  publisher: string;
  categories: string[];
  keywords: string[];
  featured: boolean;
  version?: string;
  /** the image to install it from */
  ociUri?: string;
  icon?: string;
  /** whether the catalog has a README */
  readme: boolean;
  lastUpdated?: Date;
}

function catalogEntry(extension: CatalogExtension, featured: boolean): CatalogEntry {
  const latest = extension.versions.find(version => !version.preview);
  const file = (type: string): string | undefined =>
    latest?.files.find(item => item.assetType.toLowerCase() === type)?.data;
  return {
    id: extension.id,
    displayName: extension.displayName,
    description: extension.shortDescription,
    publisher: extension.publisherDisplayName,
    categories: extension.categories,
    keywords: extension.keywords,
    featured,
    version: latest?.version,
    ociUri: latest?.ociUri,
    icon: file('icon'),
    readme: !!file('readme'),
    lastUpdated: latest?.lastUpdated,
  };
}

/** The extensions of the catalog that are listed: the featured ones first, then by their name. */
export class CatalogStore extends ListState<CatalogEntry> {
  constructor() {
    super(async () => {
      const [catalog, featured] = await Promise.all([window.getCatalogExtensions(), window.getFeaturedExtensions()]);
      return catalog
        .filter(extension => !extension.unlisted)
        .map(extension =>
          catalogEntry(
            extension,
            featured.some(item => item.id === extension.id),
          ),
        )
        .toSorted((a, b) => Number(b.featured) - Number(a.featured) || a.displayName.localeCompare(b.displayName));
    }, ['refresh-catalog', 'extensions-started']);
  }

  get(id: string): CatalogEntry | undefined {
    return this.items.find(extension => extension.id === id);
  }
}

/** The folders of the extensions in development tracked by the user. */
export class DevelopmentFoldersStore extends ListState<ExtensionDevelopmentFolderInfo> {
  constructor() {
    super(
      () => window.listExtensionDevelopmentFolders(),
      ['extension-stopped', 'extension-started', 'extensions-started', 'extensions-development-folders-changed'],
    );
  }
}

/**
 * Installs an extension from its image, reported by its task. The promise of the main process does not end on a
 * failure: the error it reports does.
 */
export function installExtension(image: string, catalogId?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    window
      .extensionInstallFromImage(
        image,
        () => {},
        error => reject(new Error(error)),
        catalogId,
      )
      .then(resolve, reject);
  });
}
