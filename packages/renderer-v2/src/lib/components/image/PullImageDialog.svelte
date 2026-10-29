<script lang="ts">
import type { ImageSearchResult } from '@desktop-framework/api';
import StarIcon from '@lucide/svelte/icons/star';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import * as NativeSelect from '#lib/components/ui/native-select/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';

interface Props {
  /** the engine pulling the image */
  engineId: string;
  onClose: () => void;
}

// pulls an image on the engine: the pull goes on in the background (a task), its result shows in a toast
let { engineId, onClose }: Props = $props();

const app = getApp();

let engine = $derived(app.engines.get(engineId));

let name = $state('');
let results: ImageSearchResult[] = $state([]);
// a short name (no registry) resolves to the registries of Podman: the one chosen
let candidates: string[] = $state([]);
let candidate = $state('');

// the registries are searched as the name is typed, the last answer only counts
let search = 0;
$effect(() => {
  const query = name.trim();
  const id = ++search;
  if (query.length < 2 || query.includes(':')) {
    results = [];
    return;
  }
  const timer = setTimeout(() => {
    window
      .searchImageInRegistry({ query, limit: 6 })
      .then(found => {
        if (id === search) {
          results = found;
        }
      })
      .catch(() => {
        // a registry not answering: no suggestions
      });
  }, 300);
  return (): void => clearTimeout(timer);
});

// a name without a registry: the registries Podman would pull it from
let resolution = 0;
$effect(() => {
  const query = name.trim();
  const connection = engine?.connection;
  const id = ++resolution;
  candidates = [];
  if (!query || query.includes('/') || connection?.type !== 'podman') {
    return;
  }
  const timer = setTimeout(() => {
    window
      .resolveShortnameImage($state.snapshot(connection), query)
      .then(names => {
        if (id === resolution) {
          candidates = names ?? [];
          candidate = candidates[0] ?? '';
        }
      })
      .catch(() => {
        // a name the engine cannot parse yet
      });
  }, 300);
  return (): void => clearTimeout(timer);
});

let image = $derived(candidates.length ? candidate : name.trim());

/**
 * opens the image pulled: looked up in a fresh list, the list of the images may not be reloaded yet
 * @param targetEngine the engine of the dialog, read when the pull starts: the dialog (its props) is gone by then
 */
function openImage(pulled: string, targetEngine: string): void {
  window
    .listImages()
    .then(images => {
      const found = images.find(
        item =>
          item.engineId === targetEngine && item.RepoTags?.some(tag => tag === pulled || tag.startsWith(`${pulled}:`)),
      );
      if (found) {
        app.workbench.open(viewRef('image-details', { engineId: targetEngine, imageId: found.Id }));
      }
    })
    .catch((error: unknown) => console.error(`Error opening ${pulled}`, error));
}

function pull(): void {
  const connection = engine?.connection;
  if (!connection || !image) {
    return;
  }
  const pulled = image;
  const targetEngine = engineId;
  const pulling = window.pullImage($state.snapshot(connection), pulled, () => {});
  // the tasks show it already when their toasts are on
  if (!app.tasks.toasts) {
    const id = toast.loading(`Pulling ${pulled}`);
    pulling
      .then(() =>
        toast.success(`${pulled} pulled`, {
          id,
          action: { label: 'Open', onClick: (): void => openImage(pulled, targetEngine) },
        }),
      )
      .catch((error: unknown) =>
        toast.error(`Pull of ${pulled} failed`, { id, description: errorMessage(error), duration: 8000 }),
      );
  }
  pulling.catch((error: unknown) => console.error(`Error pulling ${pulled}`, error));
  onClose();
}
</script>

<Dialog.Root
  open
  onOpenChange={(open): void => {
    if (!open) {
      onClose();
    }
  }}>
  <Dialog.Content size="md">
    <Dialog.Header>
      <Dialog.Title>Pull an image</Dialog.Title>
      <Dialog.Description>On {app.engines.label(engineId, engineId)}. The pull goes on in the background.</Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        pull();
      }}>
      <Dialog.Body>
        <Field.Group>
          <Field.Field>
            <Field.Label for="pull-name">Image</Field.Label>
            <Input id="pull-name" bind:value={name} placeholder="quay.io/podman/hello:latest" autocomplete="off" />
            <Field.Description>A name, and its tag after a colon (latest when not given).</Field.Description>
          </Field.Field>
          {#if results.length}
            <ul class="flex max-h-40 flex-col overflow-y-auto rounded-md border py-1" aria-label="Images found">
              {#each results as result (result.name)}
                <li>
                  <button
                    type="button"
                    class="flex w-full items-baseline gap-2 px-2.5 py-1 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    onclick={(): void => {
                      name = result.name;
                      results = [];
                    }}>
                    <span class="shrink-0 font-medium">{result.name}</span>
                    <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{result.description}</span>
                    {#if result.star_count}
                      <span class="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <StarIcon class="size-3" />{result.star_count}
                      </span>
                    {/if}
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
          {#if candidates.length}
            <Field.Field>
              <Field.Label for="pull-registry">From</Field.Label>
              <NativeSelect.Root id="pull-registry" bind:value={candidate}>
                {#each candidates as option (option)}
                  <NativeSelect.Option value={option}>{option}</NativeSelect.Option>
                {/each}
              </NativeSelect.Root>
              <Field.Description>The registries Podman searches for a name without a registry.</Field.Description>
            </Field.Field>
          {/if}
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!image || !engine}>Pull</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
