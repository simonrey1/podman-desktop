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
import PlayIcon from '@lucide/svelte/icons/play';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import { pruneKey, type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';

/** The actions of a pod: in its row, in the header of its details, and in the bulk actions. */
export function podActions(pod: PodInfo): ResourceActionSet {
  const { engineId, Id: podId } = pod;
  const running = pod.Status.toLowerCase() === 'running';
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
