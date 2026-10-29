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
import ArchiveIcon from '@lucide/svelte/icons/archive';
import BrushCleaningIcon from '@lucide/svelte/icons/brush-cleaning';
import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
import FileCodeIcon from '@lucide/svelte/icons/file-code';
import PlayIcon from '@lucide/svelte/icons/play';
import PlugIcon from '@lucide/svelte/icons/plug';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import TextAlignStartIcon from '@lucide/svelte/icons/text-align-start';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import type { Uri } from '@podman-desktop/api';
import { toast } from 'svelte-sonner';

import type { App } from '#lib/app.svelte.js';
import { pruneKey, type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import { containerName } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';

/** the address of the first port published on the host, e.g. `http://localhost:8080` */
function browserUrl(container: ContainerInfo): string | undefined {
  const port = container.Ports?.find(port => port.PublicPort)?.PublicPort;
  return port ? `http://localhost:${port}` : undefined;
}

/** asks where to save the filesystem of the container, then exports it as a `.tar` */
async function exportContainer(container: ContainerInfo): Promise<void> {
  const name = containerName(container);
  const target = await window.saveDialog({
    title: `Export ${name}`,
    defaultUri: { fsPath: `${name}.tar`, path: `${name}.tar`, scheme: 'file' } as Uri,
  });
  if (!target) {
    return;
  }
  await window.exportContainer(container.engineId, { id: container.Id, outputTarget: target.fsPath });
  toast.success(`${name} exported`, { description: target.fsPath });
}

/**
 * The actions of a container: in its row, in the header of its details, and in the bulk actions.
 * @param tty whether the container has a TTY to attach to (known from its inspect data, in its details)
 */
export function containerActions(container: ContainerInfo, app: App, tty = false): ResourceActionSet {
  const { engineId, Id: containerId } = container;
  const running = container.State === 'running';
  const paused = container.State === 'paused';
  const url = browserUrl(container);
  return {
    target: { key: resourceKey('container', engineId, containerId), name: containerName(container) },
    actions: [
      // one of them is shown: Stop when running, Start otherwise
      {
        label: 'Stop',
        progress: 'stopping',
        icon: SquareIcon,
        filled: true,
        hidden: !running,
        run: (): Promise<void> => window.stopContainer(engineId, containerId),
      },
      {
        label: 'Start',
        progress: 'starting',
        icon: PlayIcon,
        filled: true,
        hidden: running,
        // a paused container resumes
        run: (): Promise<void> =>
          paused ? window.unpauseContainer(engineId, containerId) : window.startContainer(engineId, containerId),
      },
      {
        label: 'Delete',
        progress: 'deleting',
        icon: Trash2Icon,
        destructive: true,
        disabled: running || paused,
        run: (): Promise<void> => window.deleteContainer(engineId, containerId),
      },
      {
        label: 'Restart',
        progress: 'restarting',
        icon: RotateCwIcon,
        disabled: !running,
        run: (): Promise<void> => window.restartContainer(engineId, containerId),
      },
      {
        label: 'Open in browser',
        icon: ExternalLinkIcon,
        // only for the containers publishing a port
        hidden: !url,
        disabled: !running,
        run: (): Promise<void> | undefined => (url ? window.openExternal(url) : undefined),
      },
      {
        label: 'Logs',
        icon: TextAlignStartIcon,
        run: (): void => app.workbench.open(viewRef('container-logs', { engineId, containerId })),
      },
      {
        label: 'Terminal',
        icon: TerminalIcon,
        // the infra container of a pod has no shell
        hidden: !!container.IsInfra,
        disabled: !running,
        run: (): void => app.workbench.open(viewRef('container-terminal', { engineId, containerId })),
      },
      {
        label: 'Attach',
        icon: PlugIcon,
        // a container started with a terminal and an open input: known from its inspect data, not from the list
        hidden: !tty,
        disabled: !running,
        run: (): void => app.workbench.open(viewRef('container-tty', { engineId, containerId })),
      },
      {
        label: 'Generate Kube',
        icon: FileCodeIcon,
        run: (): void =>
          app.workbench.open(viewRef('container-details', { engineId, containerId }), { state: { section: 'kube' } }),
      },
      {
        label: 'Export',
        progress: 'exporting',
        icon: ArchiveIcon,
        run: (): Promise<void> => exportContainer(container),
      },
    ],
  };
}

/** The prune of the containers of an engine, in the header of the list, removing the stopped containers. */
export function containerPrune(engineId: string, engineLabel: string): ResourceActionSet {
  return {
    target: { key: pruneKey('containers', engineId), name: 'containers' },
    actions: [
      {
        label: 'Prune',
        progress: 'pruning',
        icon: BrushCleaningIcon,
        destructive: true,
        confirmation: {
          title: 'Prune containers',
          message: `The stopped containers of ${engineLabel} will be permanently removed. This cannot be undone.`,
        },
        run: (): Promise<unknown> => window.pruneContainers(engineId),
      },
    ],
  };
}
