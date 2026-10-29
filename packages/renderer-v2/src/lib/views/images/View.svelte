<script lang="ts">
import type { ImageInfo } from '@desktop-framework/api';
import DownloadIcon from '@lucide/svelte/icons/download';
import LayersIcon from '@lucide/svelte/icons/layers';

import { getApp } from '#lib/app.svelte.js';
import { imageActions, imagePrune } from '#lib/components/image/actions.js';
import PullImageDialog from '#lib/components/image/PullImageDialog.svelte';
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

let images = $derived(app.images.ofEngine(view.params.engineId));

// the images listed by each manifest (by their digest), by manifest id
let manifestImages = $derived(
  Object.fromEntries(
    images
      .filter(image => image.isManifest)
      .map(manifest => [
        manifest.Id,
        images.filter(image => manifest.manifests?.some(entry => entry.digest === image.Digest)),
      ]),
  ),
);

// the manifest listing an image, by image id: these images are shown under their manifest only
let manifestByImage = $derived(
  Object.fromEntries(
    images
      .filter(image => image.isManifest)
      .flatMap(manifest => (manifestImages[manifest.Id] ?? []).map(image => [image.Id, manifest] as const)),
  ),
);

let rows = $derived(images.filter(image => !manifestByImage[image.Id]));

// an image is used when a container was created from it, a manifest when one of its images is
function used(image: ImageInfo): boolean {
  if (image.isManifest) {
    return (manifestImages[image.Id] ?? []).some(used);
  }
  return app.containers.ofImage(image.engineId, image.Id).length > 0;
}

const columns = imageColumns(used, image => manifestByImage[image.Id]);
</script>

<ResourceList
  engineId={view.params.engineId}
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  bind:expanded={view.state.expanded}
  canSelect={(image): boolean => !used(image) && !image.isManifest}
  getSubRows={(image): ImageInfo[] | undefined => (image.isManifest ? manifestImages[image.Id] : undefined)}
  actionsOf={(image): ResourceActionSet => imageActions(image, used(image), app)}
  prune={imagePrune(view.params.engineId, app.engines.label(view.params.engineId, view.params.engineId))}
  bulk={['Delete']}
  onCreate={(): void => app.modals.open(PullImageDialog, { engineId: view.params.engineId })}
  createLabel="Pull"
  createIcon={DownloadIcon}
  icon={LayersIcon}
  title="Images"
  noun="images"
  data={rows}
  {columns}
  getRowId={(image): string => image.Id}
  onOpen={open}
  loaded={app.images.loaded} />
