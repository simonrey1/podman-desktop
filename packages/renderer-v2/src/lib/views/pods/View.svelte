<script lang="ts">
import type { PodInfo } from '@desktop-framework/api';
import BoxesIcon from '@lucide/svelte/icons/boxes';

import { getApp } from '#lib/app.svelte.js';
import { podActions, podPrune } from '#lib/components/pod/actions.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import StateFilter from '#lib/components/StateFilter.svelte';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import { isShown } from '#lib/views/shared.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { podColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let pods = $derived(
  app.pods
    .ofEngine(view.params.engineId)
    .filter(pod => isShown(view.state.show, pod.Status.toLowerCase() === 'running')),
);

function open(row: PodInfo, options: { preview: boolean }): void {
  view.open(viewRef('pod-details', { engineId: row.engineId, podId: row.Id }), options);
}
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  actionsOf={(pod): ResourceActionSet => podActions(pod, app)}
  prune={podPrune(view.params.engineId, app.engines.label(view.params.engineId, view.params.engineId))}
  bulk={['Start', 'Stop', 'Delete']}
  icon={BoxesIcon}
  title="Pods"
  noun="pods"
  data={pods}
  columns={podColumns}
  getRowId={(pod): string => pod.Id}
  onOpen={open}
  loaded={app.pods.loaded}>
  {#snippet filters()}
    <StateFilter bind:value={view.state.show} />
  {/snippet}
</ResourceList>
