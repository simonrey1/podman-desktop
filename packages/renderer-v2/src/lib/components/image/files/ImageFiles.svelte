<script lang="ts">
import type { ImageFilesystemLayersUI, ImageFilesystemLayerUI, ImageInfo } from '@desktop-framework/api';
import FolderTreeIcon from '@lucide/svelte/icons/folder-tree';
import type { ImageFilesystemLayer } from '@podman-desktop/api';

import { getApp } from '#lib/app.svelte.js';
import ChoiceSelect from '#lib/components/ChoiceSelect.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import { Checkbox } from '#lib/components/ui/checkbox/index.js';
import * as Empty from '#lib/components/ui/empty/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { bytes } from '#lib/format.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';

import FileTree from './FileTree.svelte';

interface Props {
  image: ImageInfo;
}

/** a layer and its files: its ID and its instruction come from the layer of the extension API */
type Layer = ImageFilesystemLayerUI & Pick<ImageFilesystemLayer, 'id' | 'createdBy'>;

// the layers of an image and their files, read by a provider of an extension when asked (it can take a while)
let { image }: Props = $props();

const app = getApp();

let providers = $derived(app.imageFilesProviders.items);
let providerId = $derived(providers[0]?.id ?? '');
let layers: Layer[] | undefined = $state.raw();
let loading = $state(false);
let error: string | undefined = $state();
let selected = $state(0);
let layerOnly = $state(false);
let tokenId: number | undefined;

let layer = $derived(layers?.[selected]);

async function load(): Promise<void> {
  loading = true;
  error = undefined;
  try {
    tokenId = await window.getCancellableTokenSource();
    const result: ImageFilesystemLayersUI | undefined = await window.imageGetFilesystemLayers(
      providerId,
      $state.snapshot(image),
      tokenId,
    );
    layers = (result?.layers ?? []) as Layer[];
    // the last layer: the whole filesystem of the image
    selected = Math.max(layers.length - 1, 0);
  } catch (err: unknown) {
    error = errorMessage(err);
  } finally {
    loading = false;
    tokenId = undefined;
  }
}

// reading the layers stops when the section is left
$effect(() => (): void => {
  if (tokenId !== undefined) {
    window.cancelToken(tokenId).catch(console.error);
  }
});

/** the instruction which created the layer, as `podman history` shows it */
function instruction(createdBy: string | undefined): string {
  return (createdBy ?? '').replace(/^\/bin\/sh -c (#\(nop\) )?/, '');
}
</script>

{#if layers && layer}
  <div class="flex h-full min-h-0">
    <ul class="flex w-80 shrink-0 flex-col gap-1 overflow-y-auto border-e p-2" aria-label="Layers">
      {#each layers as item, index (item.id)}
        <li>
          <button
            type="button"
            class={[
              'flex w-full flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left outline-none focus-visible:ring-1 focus-visible:ring-ring',
              index === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
            ]}
            aria-current={index === selected}
            onclick={(): void => {
              selected = index;
            }}>
            <span class="truncate font-mono text-sm" title={instruction(item.createdBy)}>
              {instruction(item.createdBy) || item.id.substring(0, 12)}
            </span>
            <span class="text-xs text-muted-foreground tabular-nums">
              {bytes(item.sizeInArchive)} · +{item.addedCount} ~{item.modifiedCount} −{item.removedCount}
            </span>
          </button>
        </li>
      {/each}
    </ul>
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center gap-2 border-b px-3 py-2">
        <span class="min-w-0 flex-1 truncate text-muted-foreground">
          {layerOnly ? 'The files of this layer' : 'The filesystem up to this layer'}
        </span>
        <!-- a field takes the whole width: its own size here, the text takes the rest -->
        <div class="shrink-0">
        <Field.Field orientation="horizontal">
          <Checkbox id="image-files-layer-only" bind:checked={layerOnly} />
          <Field.Label for="image-files-layer-only">This layer only</Field.Label>
        </Field.Field>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-auto py-1">
        <FileTree root={layerOnly ? layer.layerTree.root : layer.stackTree.root} {layerOnly} />
      </div>
    </div>
  </div>
{:else}
  <Empty.Root>
    <Empty.Header>
      <Empty.Media variant="icon">
        <FolderTreeIcon />
      </Empty.Media>
      <Empty.Title>The files of the image</Empty.Title>
      <Empty.Description>
        Its layers are read, then their files listed: this can take a while for a large image.
      </Empty.Description>
    </Empty.Header>
    <Empty.Content>
      {#if providers.length > 1}
        <ChoiceSelect
          bind:value={providerId}
          aria-label="Read by"
          options={providers.map(provider => ({ value: provider.id, label: provider.label }))} />
      {/if}
      <Button
        disabled={loading || !providerId}
        onclick={(): void => {
          load().catch(console.error);
        }}>
        {#if loading}
          <Spinner data-icon="inline-start" />
          Reading the layers
        {:else}
          Read the layers
        {/if}
      </Button>
      {#if error}
        <p class="text-destructive">{error}</p>
      {/if}
    </Empty.Content>
  </Empty.Root>
{/if}
