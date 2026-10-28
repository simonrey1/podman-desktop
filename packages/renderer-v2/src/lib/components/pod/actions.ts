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

import type { PodInfo } from '@desktop-framework/api';
import BrushCleaningIcon from '@lucide/svelte/icons/brush-cleaning';
import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
import FileCodeIcon from '@lucide/svelte/icons/file-code';
import PlayIcon from '@lucide/svelte/icons/play';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import type { App } from '#lib/app.svelte.js';
import { pruneKey, type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';

/** the address of the first port published by the containers of the pod, e.g. `http://localhost:8080` */
function browserUrl(pod: PodInfo, app: App): string | undefined {
  const port = pod.Containers.flatMap(({ Id }) => app.containers.get(pod.engineId, Id)?.Ports ?? []).find(
    port => port.PublicPort,
  )?.PublicPort;
  return port ? `http://localhost:${port}` : undefined;
}

/** The actions of a pod: in its row, in the header of its details, and in the bulk actions. */
export function podActions(pod: PodInfo, app: App): ResourceActionSet {
  const { engineId, Id: podId } = pod;
  const running = pod.Status.toLowerCase() === 'running';
  const url = browserUrl(pod, app);
  return {
    target: { key: resourceKey('pod', engineId, podId), name: pod.Name },
    actions: [
      // one of them is shown: Stop when running, Start otherwise
      {
        label: 'Stop',
        progress: 'stopping',
        icon: SquareIcon,
        filled: true,
        hidden: !running,
        run: (): Promise<void> => window.stopPod(engineId, podId),
      },
      {
        label: 'Start',
        progress: 'starting',
        icon: PlayIcon,
        filled: true,
        hidden: running,
        run: (): Promise<void> => window.startPod(engineId, podId),
      },
      {
        label: 'Delete',
        progress: 'deleting',
        icon: Trash2Icon,
        destructive: true,
        run: (): Promise<void> => window.removePod(engineId, podId),
      },
      {
        label: 'Restart',
        progress: 'restarting',
        icon: RotateCwIcon,
        disabled: !running,
        run: (): Promise<void> => window.restartPod(engineId, podId),
      },
      {
        label: 'Open in browser',
        icon: ExternalLinkIcon,
        // only for the pods publishing a port
        hidden: !url,
        disabled: !running,
        run: (): Promise<void> | undefined => (url ? window.openExternal(url) : undefined),
      },
      {
        label: 'Generate Kube',
        icon: FileCodeIcon,
        run: (): void =>
          app.workbench.open(viewRef('pod-details', { engineId, podId }), { state: { section: 'kube' } }),
      },
    ],
  };
}

/** The prune of the pods of an engine, in the header of the list, removing the stopped pods. */
export function podPrune(engineId: string, engineLabel: string): ResourceActionSet {
  return {
    target: { key: pruneKey('pods', engineId), name: 'pods' },
    actions: [
      {
        label: 'Prune',
        progress: 'pruning',
        icon: BrushCleaningIcon,
        destructive: true,
        confirmation: {
          title: 'Prune pods',
          message: `The stopped pods of ${engineLabel} will be permanently removed. This cannot be undone.`,
        },
        run: (): Promise<unknown> => window.prunePods(engineId),
      },
    ],
  };
}
