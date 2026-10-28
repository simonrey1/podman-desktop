<script lang="ts">
import type { VolumeInfo } from '@desktop-framework/api';
import HardDriveIcon from '@lucide/svelte/icons/hard-drive';

import { getApp } from '#lib/app.svelte.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { volumeColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

function open(row: VolumeInfo, options: { preview: boolean }): void {
  view.open(viewRef('volume-details', { engineId: row.engineId, volumeName: row.Name }), options);
}
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  canSelect={(volume): boolean => !volume.containersUsage?.length}
  icon={HardDriveIcon}
  title="Volumes"
  noun="volumes"
  data={app.volumes.ofEngine(view.params.engineId)}
  columns={volumeColumns}
  getRowId={(volume): string => volume.Name}
  onOpen={open}
  loaded={app.volumes.loaded} />
