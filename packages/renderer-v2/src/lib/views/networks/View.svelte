<script lang="ts">
import type { NetworkInspectInfo } from '@desktop-framework/api';
import NetworkIcon from '@lucide/svelte/icons/network';

import { getApp } from '#lib/app.svelte.js';
import { networkActions } from '#lib/components/network/actions.js';
import CreateNetworkDialog from '#lib/components/network/CreateNetworkDialog.svelte';
import ResourceList from '#lib/components/ResourceList.svelte';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { networkColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

function open(row: NetworkInspectInfo, options: { preview: boolean }): void {
  view.open(viewRef('network-details', { engineId: row.engineId, networkId: row.Id }), options);
}
</script>

<ResourceList
  engineId={view.params.engineId}
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  canSelect={(network): boolean => Object.keys(network.Containers ?? {}).length === 0}
  actionsOf={(network): ResourceActionSet => networkActions(network, app)}
  bulk={['Delete']}
  onCreate={(): void => app.modals.open(CreateNetworkDialog, { engineId: view.params.engineId })}
  icon={NetworkIcon}
  title="Networks"
  noun="networks"
  data={app.networks.ofEngine(view.params.engineId)}
  columns={networkColumns}
  getRowId={(network): string => network.Id}
  onOpen={open}
  loaded={app.networks.loaded} />
