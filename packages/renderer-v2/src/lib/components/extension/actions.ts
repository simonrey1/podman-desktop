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

import { type ExtensionInfo } from '@desktop-framework/api';
import ArrowUpCircleIcon from '@lucide/svelte/icons/circle-arrow-up';
import DownloadIcon from '@lucide/svelte/icons/download';
import PlayIcon from '@lucide/svelte/icons/play';
import SettingsIcon from '@lucide/svelte/icons/settings';
import SquareIcon from '@lucide/svelte/icons/square';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import { toast } from 'svelte-sonner';

import type { App } from '#lib/app.svelte.js';
import { type ResourceAction, type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import { type CatalogEntry, installExtension } from '#lib/stores/extensions.svelte.js';
import { viewRef } from '#lib/views/index.js';

/** the key of an extension for its actions: while one runs, its progress shows on it (an installed one or not) */
export function extensionKey(id: string): string {
  return resourceKey('extension', 'extensions', id);
}

/** where an installed extension comes from */
export function extensionBadges(extension: ExtensionInfo): string[] {
  return [
    ...(extension.devMode ? ['Development'] : extension.bundled ? ['Bundled'] : []),
    ...(extension.overrides ? ['Overrides'] : []),
  ];
}

/** the page of the settings of an extension, when it has some */
function settingsPage(id: string, app: App): string | undefined {
  const prefix = `preferences.${id}`;
  return app.configuration.shown.some(setting => setting.parentId.startsWith(prefix)) ? `section:${prefix}` : undefined;
}

function startStop(extension: ExtensionInfo): ResourceAction[] {
  const running = extension.state === 'started';
  return [
    {
      label: 'Stop',
      progress: 'stopping',
      icon: SquareIcon,
      filled: true,
      hidden: !running,
      run: (): Promise<void> => window.stopExtension(extension.id),
    },
    {
      label: 'Start',
      progress: 'starting',
      icon: PlayIcon,
      filled: true,
      hidden: running,
      disabled: extension.state === 'starting' || extension.state === 'stopping',
      run: (): Promise<void> => window.startExtension(extension.id),
    },
  ];
}

/** The actions on an installed extension: start or stop, update, its settings, remove (stopped, once confirmed). */
export function extensionActions(extension: ExtensionInfo, app: App): ResourceActionSet {
  const { update } = extension;
  const page = settingsPage(extension.id, app);
  return {
    target: { key: extensionKey(extension.id), name: extension.displayName },
    actions: [
      ...startStop(extension),
      {
        label: update ? `Update to v${update.version}` : 'Update',
        progress: 'updating',
        icon: ArrowUpCircleIcon,
        hidden: !update,
        run: async (): Promise<void> => {
          if (update) {
            await window.updateExtension(extension.id, update.ociUri);
          }
        },
      },
      {
        label: 'Settings',
        icon: SettingsIcon,
        hidden: !page,
        run: (): void => app.workbench.open(viewRef('settings', {}), { state: { page } }),
      },
      {
        label: 'Remove',
        progress: 'removing',
        icon: Trash2Icon,
        destructive: true,
        hidden: !extension.removable,
        // a running extension is stopped first
        disabled: extension.state !== 'stopped' && extension.state !== 'failed',
        confirmation: {
          title: `Remove ${extension.displayName}`,
          message: `${extension.displayName} will be removed from Podman Desktop.`,
        },
        run: (): Promise<void> => window.removeExtension(extension.id),
      },
    ],
  };
}

/** Installs an extension of the catalog, or from an image given by the user. */
export function installAction(name: string, image: string | undefined, catalogId?: string): ResourceAction {
  return {
    label: 'Install',
    progress: 'installing',
    icon: DownloadIcon,
    hidden: !image,
    run: async (): Promise<void> => {
      if (image) {
        await installExtension(image, catalogId);
        toast.success(`${name} installed`);
      }
    },
  };
}

/** The action on an extension of the catalog: to install it, unless it is installed. */
export function catalogActions(entry: CatalogEntry, installed: boolean): ResourceActionSet {
  const action = installAction(entry.displayName, entry.ociUri, entry.id);
  return {
    target: { key: extensionKey(entry.id), name: entry.displayName },
    actions: [{ ...action, hidden: !entry.ociUri || installed }],
  };
}

/** The actions on a tracked folder: start or stop its extension when it is loaded, untrack it (stopped, once confirmed). */
export function folderActions(path: string, extension: ExtensionInfo | undefined): ResourceActionSet {
  return {
    target: { key: resourceKey('extension', 'folders', path), name: path },
    actions: [
      ...(extension ? startStop(extension) : []),
      {
        label: 'Untrack',
        progress: 'untracking',
        icon: Trash2Icon,
        destructive: true,
        // a running extension is stopped first
        disabled: !!extension && extension.state !== 'stopped' && extension.state !== 'failed',
        confirmation: {
          title: 'Untrack the folder',
          message: `${path} will not be loaded anymore. It is not deleted.`,
        },
        run: async (): Promise<void> => {
          await window.untrackExtensionFolder(path);
          // clears it from the extensions disabled
          if (extension) {
            await window.removeExtension(extension.id);
          }
        },
      },
    ],
  };
}
