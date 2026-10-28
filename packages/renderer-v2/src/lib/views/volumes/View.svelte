<script lang="ts">
import HardDriveIcon from '@lucide/svelte/icons/hard-drive';

import { getApp } from '#lib/app.svelte.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { volumeColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  icon={HardDriveIcon}
  title="Volumes"
  noun="volumes"
  data={app.volumes.ofEngine(view.params.engineId)}
  columns={volumeColumns}
  getRowId={(volume): string => volume.Name}
  loaded={app.volumes.loaded} />
