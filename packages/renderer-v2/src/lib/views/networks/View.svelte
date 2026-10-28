<script lang="ts">
import NetworkIcon from '@lucide/svelte/icons/network';

import { getApp } from '#lib/app.svelte.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { networkColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  icon={NetworkIcon}
  title="Networks"
  noun="networks"
  data={app.networks.ofEngine(view.params.engineId)}
  columns={networkColumns}
  getRowId={(network): string => network.Id}
  loaded={app.networks.loaded} />
