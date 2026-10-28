<script lang="ts">
import type { ContainerInfo } from '@desktop-framework/api';
import BoxIcon from '@lucide/svelte/icons/box';

import { getApp } from '#lib/app.svelte.js';
import { containerActions, containerPrune } from '#lib/components/container/actions.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import StateFilter from '#lib/components/StateFilter.svelte';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import { isShown } from '#lib/views/shared.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { containerColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let containers = $derived(
  app.containers
    .ofEngine(view.params.engineId)
    .filter(container => isShown(view.state.show, container.State === 'running')),
);

function open(container: ContainerInfo, options: { preview: boolean }): void {
  view.open(viewRef('container-details', { engineId: container.engineId, containerId: container.Id }), options);
}
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  actionsOf={(container): ResourceActionSet => containerActions(container, app)}
  prune={containerPrune(view.params.engineId, app.engines.label(view.params.engineId, view.params.engineId))}
  bulk={['Start', 'Stop', 'Delete']}
  icon={BoxIcon}
  title="Containers"
  noun="containers"
  data={containers}
  columns={containerColumns}
  getRowId={(container): string => container.Id}
  onOpen={open}
  loaded={app.containers.loaded}>
  {#snippet filters()}
    <StateFilter bind:value={view.state.show} />
  {/snippet}
</ResourceList>
