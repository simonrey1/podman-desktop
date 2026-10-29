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

import PlayIcon from '@lucide/svelte/icons/play';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import { type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';

/** the label of the containers of a Compose project: its value is the name of the project */
export const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';

/**
 * The actions of a Compose project, in its group of the containers list: they apply to all its containers.
 * @param running how many of its `total` containers run
 */
export function composeActions(engineId: string, project: string, running: number, total: number): ResourceActionSet {
  const run = (call: typeof window.startContainersByLabel) => (): Promise<void> =>
    call(engineId, COMPOSE_PROJECT_LABEL, project);
  return {
    target: { key: resourceKey('compose', engineId, project), name: project },
    actions: [
      // one of them is shown: Stop while one of its containers runs, Start otherwise
      {
        label: 'Stop',
        progress: 'stopping',
        icon: SquareIcon,
        filled: true,
        hidden: running === 0,
        run: run(window.stopContainersByLabel),
      },
      {
        label: 'Start',
        progress: 'starting',
        icon: PlayIcon,
        filled: true,
        hidden: running > 0,
        run: run(window.startContainersByLabel),
      },
      {
        label: 'Delete',
        progress: 'deleting',
        icon: Trash2Icon,
        destructive: true,
        confirmation: {
          title: `Delete ${project}`,
          message: `The ${total} container${total > 1 ? 's' : ''} of the Compose project ${project} will be permanently removed. This cannot be undone.`,
        },
        run: run(window.deleteContainersByLabel),
      },
      {
        label: 'Restart',
        progress: 'restarting',
        icon: RotateCwIcon,
        disabled: running === 0,
        run: run(window.restartContainersByLabel),
      },
    ],
  };
}
