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

import PencilIcon from '@lucide/svelte/icons/pencil';
import PlayIcon from '@lucide/svelte/icons/play';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import type { App } from '#lib/app.svelte.js';
import { type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import type { Connection } from '#lib/stores/engines.svelte.js';

import ConnectionFormDialog from './ConnectionFormDialog.svelte';

type Lifecycle = 'start' | 'stop' | 'delete' | 'edit';

/**
 * Runs a lifecycle method of a connection in its provider; a failure is the last error the provider logged (the
 * reason), else the error of the call.
 */
async function lifecycle(connection: Connection, method: Exclude<Lifecycle, 'edit'>): Promise<void> {
  const calls = {
    start: window.startProviderConnectionLifecycle,
    stop: window.stopProviderConnectionLifecycle,
    delete: window.deleteProviderConnectionLifecycle,
  };
  let logged: string | undefined;
  const logger = (_key: symbol, event: 'log' | 'warn' | 'error' | 'finish', args: string[]): void => {
    if (event === 'error') {
      logged = args.join(' ');
    }
  };
  try {
    await calls[method](
      connection.provider.internalId,
      $state.snapshot(connection.info) as typeof connection.info,
      Symbol(connection.id),
      logger,
    );
  } catch (error: unknown) {
    throw logged ? new Error(logged) : error;
  }
}

/**
 * The lifecycle of a connection, the methods its provider offers: start or stop (by its status), restart, edit (in a
 * modal), delete (stopped, once confirmed). In its row of the system overview and in the header of its overview.
 */
export function connectionActions(connection: Connection, app: App): ResourceActionSet {
  const methods = connection.info.lifecycleMethods ?? [];
  const status = connection.info.status;
  const running = status === 'started';
  const busy = status === 'starting' || status === 'stopping';
  const can = (method: Lifecycle): boolean => methods.includes(method);
  return {
    target: { key: resourceKey('connection', connection.provider.id, connection.id), name: connection.name },
    actions: [
      // one of them is shown: Stop when started, Start otherwise
      {
        label: 'Stop',
        progress: 'stopping',
        icon: SquareIcon,
        filled: true,
        hidden: !can('stop') || !running,
        run: (): Promise<void> => lifecycle(connection, 'stop'),
      },
      {
        label: 'Start',
        progress: 'starting',
        icon: PlayIcon,
        filled: true,
        hidden: !can('start') || running,
        disabled: busy,
        run: (): Promise<void> => lifecycle(connection, 'start'),
      },
      {
        label: 'Restart',
        progress: 'restarting',
        icon: RotateCwIcon,
        hidden: !can('start') || !can('stop'),
        disabled: !running,
        run: async (): Promise<void> => {
          await lifecycle(connection, 'stop');
          await lifecycle(connection, 'start');
        },
      },
      {
        label: 'Edit',
        icon: PencilIcon,
        hidden: !can('edit'),
        disabled: busy,
        run: (): void =>
          app.modals.open(ConnectionFormDialog, { provider: connection.provider, kind: connection.kind, connection }),
      },
      {
        label: 'Delete',
        progress: 'deleting',
        icon: Trash2Icon,
        destructive: true,
        hidden: !can('delete'),
        // a running connection is stopped first
        disabled: running || busy,
        confirmation: {
          title: `Delete ${connection.name}`,
          message: `${connection.name} will be permanently removed by ${connection.provider.name}, with what it contains. This cannot be undone.`,
        },
        run: (): Promise<void> => lifecycle(connection, 'delete'),
      },
    ],
  };
}
