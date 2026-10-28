<script lang="ts">
import BoxesIcon from '@lucide/svelte/icons/boxes';

import { getApp } from '#lib/app.svelte.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { podColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();
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
  loaded={app.pods.loaded} />
