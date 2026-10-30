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

import type { NetworkInspectInfo } from '@desktop-framework/api';
import GlobeIcon from '@lucide/svelte/icons/globe';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import type { App } from '#lib/app.svelte.js';
import { withNetworkContributions } from '#lib/components/contributions.js';
import { type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';

import UpdateDnsDialog from './UpdateDnsDialog.svelte';

/** The actions of a network: in its row, in the header of its details, and in the bulk actions. */
function networkActionsBuiltin(network: NetworkInspectInfo, app: App): ResourceActionSet {
  return {
    target: { key: resourceKey('network', network.engineId, network.Id), name: network.Name },
    actions: [
      {
        label: 'Delete',
        progress: 'deleting',
        icon: Trash2Icon,
        destructive: true,
        // a network used by a container cannot be deleted
        disabled: Object.keys(network.Containers ?? {}).length > 0,
        run: (): Promise<void> => window.removeNetwork(network.engineId, network.Id),
      },
      {
        label: 'Update DNS',
        icon: GlobeIcon,
        // the DNS servers of a network are a feature of Podman
        hidden: network.engineType !== 'podman',
        run: (): void => app.modals.open(UpdateDnsDialog, { network }),
      },
    ],
  };
}

/** The actions of a network, then the ones of the extensions. */
export function networkActions(network: NetworkInspectInfo, app: App): ResourceActionSet {
  const set = networkActionsBuiltin(network, app);
  return { ...set, actions: withNetworkContributions(set.actions, network, app) };
}
