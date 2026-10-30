<script lang="ts">
import type { VolumeInfo } from '@desktop-framework/api';
import HardDriveIcon from '@lucide/svelte/icons/hard-drive';

import { getApp } from '#lib/app.svelte.js';
import ListActionButton from '#lib/components/ListActionButton.svelte';
import ResourceList from '#lib/components/ResourceList.svelte';
import { volumeActions, volumePrune, volumeSizes } from '#lib/components/volume/actions.js';
import CreateVolumeDialog from '#lib/components/volume/CreateVolumeDialog.svelte';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { volumeColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

const columns = volumeColumns(volume => app.volumes.size(volume));

function open(row: VolumeInfo, options: { preview: boolean }): void {
  view.open(viewRef('volume-details', { engineId: row.engineId, volumeName: row.Name }), options);
}
</script>

<ResourceList
  engineId={view.params.engineId}
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  canSelect={(volume): boolean => !volume.containersUsage?.length}
  actionsOf={(volume): ResourceActionSet => volumeActions(volume, app)}
  prune={volumePrune(view.params.engineId, app.engines.label(view.params.engineId, view.params.engineId))}
  bulk={['Delete']}
  onCreate={(): void => app.modals.open(CreateVolumeDialog, { engineId: view.params.engineId })}
  icon={HardDriveIcon}
  title="Volumes"
  noun="volumes"
  data={app.volumes.ofEngine(view.params.engineId)}
  {columns}
  getRowId={(volume): string => volume.Name}
  onOpen={open}
  loaded={app.volumes.loaded}>
  {#snippet filters()}
    <ListActionButton set={volumeSizes(view.params.engineId, app)} />
  {/snippet}
</ResourceList>
