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
import PlayIcon from '@lucide/svelte/icons/play';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import TextAlignStartIcon from '@lucide/svelte/icons/text-align-start';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import type { App } from '#lib/app.svelte.js';
import { type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import { containerName } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';

/** The actions of a container: in its row, in the header of its details, and in the bulk actions. */
export function containerActions(container: ContainerInfo, app: App): ResourceActionSet {
  const { engineId, Id: containerId } = container;
  const running = container.State === 'running';
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
        run: (): Promise<void> => window.startContainer(engineId, containerId),
      },
      {
        label: 'Delete',
        progress: 'deleting',
        icon: Trash2Icon,
        destructive: true,
        disabled: running,
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
        label: 'Logs',
        icon: TextAlignStartIcon,
        run: (): void => app.workbench.open(viewRef('container-logs', { engineId, containerId })),
      },
      {
        label: 'Terminal',
        icon: TerminalIcon,
        disabled: !running,
        run: (): void => app.workbench.open(viewRef('container-terminal', { engineId, containerId })),
      },
    ],
  };
}
