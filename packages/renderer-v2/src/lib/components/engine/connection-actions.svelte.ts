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

import type { ProviderContainerConnectionInfo } from '@desktop-framework/api';
import PencilIcon from '@lucide/svelte/icons/pencil';
import PlayIcon from '@lucide/svelte/icons/play';
import RotateCwIcon from '@lucide/svelte/icons/rotate-cw';
import SquareIcon from '@lucide/svelte/icons/square';
import SquareTerminalIcon from '@lucide/svelte/icons/square-terminal';
import TextAlignStartIcon from '@lucide/svelte/icons/text-align-start';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import type { App } from '#lib/app.svelte.js';
import { withConnectionContributions } from '#lib/components/contributions.js';
import { type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import type { Connection } from '#lib/stores/engines.svelte.js';
import { viewRef } from '#lib/views/index.js';

import ConnectionEditDialog from './ConnectionEditDialog.svelte';

type Lifecycle = 'start' | 'stop' | 'delete' | 'edit';

const TITLES = { start: 'Starting', stop: 'Stopping', delete: 'Deleting' };

/**
 * Runs a lifecycle method of a connection in its provider; a failure is the last error the provider logged (the
 * reason), else the error of the call.
 */
async function lifecycle(connection: Connection, method: Exclude<Lifecycle, 'edit'>, app: App): Promise<void> {
  const calls = {
    start: window.startProviderConnectionLifecycle,
    stop: window.stopProviderConnectionLifecycle,
    delete: window.deleteProviderConnectionLifecycle,
  };
  let logged: string | undefined;
  // the output of the provider is kept for the logs of the connection
  app.connectionLogs.begin(connection.id, TITLES[method]);
  const logger = (_key: symbol, event: 'log' | 'warn' | 'error' | 'finish', args: string[]): void => {
    if (event === 'error') {
      logged = args.join(' ');
    }
    if (event !== 'finish') {
      app.connectionLogs.write(connection.id, event, args.join(' '));
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
    // the main process already logs the failure, it comes to the logger above
    throw logged ? new Error(logged) : error;
  }
}

/**
 * The lifecycle of a connection, the methods its provider offers: start or stop (by its status), restart, edit (in a
 * modal), delete (stopped, once confirmed). In its row of the system overview and in the header of its overview.
 */
function connectionActionsBuiltin(connection: Connection, app: App): ResourceActionSet {
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
        run: (): Promise<void> => lifecycle(connection, 'stop', app),
      },
      {
        label: 'Start',
        progress: 'starting',
        icon: PlayIcon,
        filled: true,
        hidden: !can('start') || running,
        disabled: busy,
        run: (): Promise<void> => lifecycle(connection, 'start', app),
      },
      {
        label: 'Restart',
        progress: 'restarting',
        icon: RotateCwIcon,
        hidden: !can('start') || !can('stop'),
        disabled: !running,
        run: async (): Promise<void> => {
          await lifecycle(connection, 'stop', app);
          await lifecycle(connection, 'start', app);
        },
      },
      {
        label: 'Logs',
        icon: TextAlignStartIcon,
        // the output of its lifecycle operations
        hidden: methods.length === 0,
        run: (): void => app.workbench.open(viewRef('connection-logs', { connectionId: connection.id })),
      },
      {
        label: 'Terminal',
        icon: SquareTerminalIcon,
        // a shell in the connection (e.g. in a Podman machine), when its provider gives one
        hidden: !('shellAccess' in connection.info && connection.info.shellAccess),
        disabled: !running,
        run: (): void => app.workbench.open(viewRef('connection-terminal', { connectionId: connection.id })),
      },
      {
        label: 'Edit',
        icon: PencilIcon,
        hidden: !can('edit'),
        disabled: busy,
        run: (): void => app.modals.open(ConnectionEditDialog, { connection }),
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
        run: (): Promise<void> => lifecycle(connection, 'delete', app),
      },
    ],
  };
}

/** The actions of a connection, then the ones of the extensions on a container engine. */
export function connectionActions(connection: Connection, app: App): ResourceActionSet {
  const set = connectionActionsBuiltin(connection, app);
  return connection.kind === 'container'
    ? {
        ...set,
        actions: withConnectionContributions(set.actions, connection.info as ProviderContainerConnectionInfo, app),
      }
    : set;
}
