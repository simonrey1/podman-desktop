<script lang="ts">
import LayersIcon from '@lucide/svelte/icons/layers';

import { getApp } from '#lib/app.svelte.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { imageColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

// an image is used when a container was created from it
const columns = imageColumns(image => app.containers.items.some(container => container.ImageID === image.Id));
</script>

<ResourceList
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  icon={LayersIcon}
  title="Images"
  noun="images"
  data={app.images.ofEngine(view.params.engineId)}
  {columns}
  getRowId={(image): string => image.Id}
  loaded={app.images.loaded} />
