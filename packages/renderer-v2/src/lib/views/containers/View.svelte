<script lang="ts">
import BoxIcon from '@lucide/svelte/icons/box';

import { getApp } from '#lib/app.svelte.js';
import { containerPrune } from '#lib/components/container/actions.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import StateFilter from '#lib/components/StateFilter.svelte';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import { isShown } from '#lib/views/shared.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { containerColumns } from './columns.js';
import { type ContainerRow, containerRows } from './rows.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

// the containers of a Compose project or of a pod are grouped; a group shows the containers shown by the filters
let rows = $derived(
  containerRows(
    app.containers
      .ofEngine(view.params.engineId)
      .filter(container => isShown(view.state.show, container.State === 'running')),
    app,
  ),
);

// a container opens its details, a pod group the details of the pod (a Compose project has no details yet)
function open(row: ContainerRow, options: { preview: boolean }): void {
  if (row.container) {
    view.open(
      viewRef('container-details', { engineId: row.container.engineId, containerId: row.container.Id }),
      options,
    );
  } else if (row.pod) {
    view.open(viewRef('pod-details', { engineId: row.pod.engineId, podId: row.pod.Id }), options);
  }
}
</script>

<ResourceList
  engineId={view.params.engineId}
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  bind:expanded={view.state.expanded}
  filtered={view.state.show !== 'all'}
  onResetFilters={(): unknown => (view.state.show = 'all')}
  actionsOf={(row): ResourceActionSet => row.actions}
  canSelect={(row): boolean => !!row.container}
  getSubRows={(row): ContainerRow[] | undefined => row.children}
  prune={containerPrune(view.params.engineId, app.engines.label(view.params.engineId, view.params.engineId))}
  bulk={['Start', 'Stop', 'Delete']}
  icon={BoxIcon}
  title="Containers"
  noun="containers"
  data={rows}
  columns={containerColumns}
  getRowId={(row): string => row.id}
  onOpen={open}
  loaded={app.containers.loaded}>
  {#snippet filters()}
    <StateFilter bind:value={view.state.show} />
  {/snippet}
</ResourceList>
