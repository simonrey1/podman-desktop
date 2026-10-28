<script lang="ts">
import type { ImageInfo } from '@desktop-framework/api';
import LayersIcon from '@lucide/svelte/icons/layers';

import { getApp } from '#lib/app.svelte.js';
import { imageActions, imagePrune } from '#lib/components/image/actions.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { imageColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

function open(row: ImageInfo, options: { preview: boolean }): void {
  view.open(viewRef('image-details', { engineId: row.engineId, imageId: row.Id }), options);
}

// an image is used when a container was created from it
function used(image: ImageInfo): boolean {
  return app.containers.ofImage(image.engineId, image.Id).length > 0;
}

const columns = imageColumns(used);
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  canSelect={(image): boolean => !used(image)}
  actionsOf={(image): ResourceActionSet => imageActions(image, used(image), app)}
  prune={imagePrune(view.params.engineId, app.engines.label(view.params.engineId, view.params.engineId))}
  bulk={['Delete']}
  icon={LayersIcon}
  title="Images"
  noun="images"
  data={app.images.ofEngine(view.params.engineId)}
  {columns}
  getRowId={(image): string => image.Id}
  onOpen={open}
  loaded={app.images.loaded} />
