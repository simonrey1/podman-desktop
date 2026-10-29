<script lang="ts">
import FolderTreeIcon from '@lucide/svelte/icons/folder-tree';

import { getApp } from '#lib/app.svelte.js';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import ImageFiles from '#lib/components/image/files/ImageFiles.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import { shortId } from '#lib/stores/containers.svelte.js';
import { imageName } from '#lib/stores/images.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the layers of an image and their files: an exploration of its own, with its selection, kept while the tab is open
const app = getApp();

let image = $derived(app.images.get(view.params.engineId, view.params.imageId));
</script>

<Page
  icon={FolderTreeIcon}
  title="Files of {image ? imageName(image) : shortId(view.params.imageId)}"
  body="fill">
  {#snippet meta()}
    <EngineBadge engineId={view.params.engineId} />
  {/snippet}
  {#if image}
    <ImageFiles {image} />
  {:else if app.images.loaded}
    <NotFound noun="Image" />
  {/if}
</Page>
