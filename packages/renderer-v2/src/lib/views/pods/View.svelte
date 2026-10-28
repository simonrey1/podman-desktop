<script lang="ts">
import type { PodInfo } from '@desktop-framework/api';
import BoxesIcon from '@lucide/svelte/icons/boxes';

import { getApp } from '#lib/app.svelte.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { podColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

function open(row: PodInfo, options: { preview: boolean }): void {
  view.open(viewRef('pod-details', { engineId: row.engineId, podId: row.Id }), options);
}
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  icon={BoxesIcon}
  title="Pods"
  noun="pods"
  data={app.pods.ofEngine(view.params.engineId)}
  columns={podColumns}
  getRowId={(pod): string => pod.Id}
  onOpen={open}
  loaded={app.pods.loaded} />
