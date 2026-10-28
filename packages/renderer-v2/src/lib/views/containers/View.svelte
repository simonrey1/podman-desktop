<script lang="ts">
import type { ContainerInfo } from '@desktop-framework/api';
import BoxIcon from '@lucide/svelte/icons/box';

import { getApp } from '#lib/app.svelte.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { containerColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let containers = $derived(
  app.containers
    .ofEngine(view.params.engineId)
    .filter(
      container => view.state.show === 'all' || (view.state.show === 'running') === (container.State === 'running'),
    ),
);

function open(container: ContainerInfo, options: { preview: boolean }): void {
  view.open(viewRef('container-details', { engineId: container.engineId, containerId: container.Id }), options);
}
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  icon={BoxIcon}
  title="Containers"
  noun="containers"
  data={containers}
  columns={containerColumns}
  getRowId={(container): string => container.Id}
  onOpen={open}
  loaded={app.containers.loaded}>
  {#snippet filters()}
    <SegmentedControl
      label="State"
      bind:value={view.state.show}
      options={[
        { value: 'all', label: 'All' },
        { value: 'running', label: 'Running' },
        { value: 'stopped', label: 'Stopped' },
      ]} />
  {/snippet}
</ResourceList>
