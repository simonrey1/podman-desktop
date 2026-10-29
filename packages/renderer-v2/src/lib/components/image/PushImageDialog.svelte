<script lang="ts">
import type { ImageInfo } from '@desktop-framework/api';
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import { untrack } from 'svelte';

import { AsyncValue } from '#lib/async-value.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import * as NativeSelect from '#lib/components/ui/native-select/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';

interface Props {
  image: ImageInfo;
  onClose: () => void;
}

// pushes a tag of the image to its registry, showing the progress of its layers
let { image, onClose }: Props = $props();

let tags = $derived((image.RepoTags ?? []).filter(tag => tag !== '<none>:<none>'));
let tag = $state(untrack(() => tags[0] ?? ''));

// the registry of the tag needs credentials to push
const authenticated = new AsyncValue<boolean>(() => (tag ? window.hasAuthconfigForImage(tag) : undefined));

let status: 'idle' | 'pushing' | 'pushed' | 'failed' = $state('idle');
// the messages of the push, and the last status of each layer
let messages: string[] = $state([]);
let layers: Record<string, string> = $state({});

function push(): void {
  status = 'pushing';
  messages = [];
  layers = {};
  let failed = false;
  window
    .pushImage(image.engineId, tag, (name, data) => {
      if (name === 'data') {
        const event = JSON.parse(data) as { id?: string; status?: string; error?: string };
        if (event.error) {
          failed = true;
          messages.push(event.error);
        } else if (event.id && event.status) {
          layers[event.id] = event.status;
        } else if (event.status) {
          messages.push(event.status);
        }
      } else if (name === 'error') {
        failed = true;
        messages.push(data);
      } else if (name === 'end') {
        status = failed ? 'failed' : 'pushed';
      }
    })
    .catch((error: unknown) => {
      messages.push(errorMessage(error));
      status = 'failed';
    });
}
</script>

<Dialog.Root
  open
  onOpenChange={(open): void => {
    // the push goes on in the background when the dialog is closed
    if (!open) {
      onClose();
    }
  }}>
  <Dialog.Content size="md">
    <Dialog.Header>
      <Dialog.Title>Push image</Dialog.Title>
      <Dialog.Description>Pushes a tag of the image to its registry.</Dialog.Description>
    </Dialog.Header>
    <Dialog.Body>
      <Field.Field>
        <Field.Label for="push-tag">Tag</Field.Label>
        <NativeSelect.Root id="push-tag" bind:value={tag} disabled={status === 'pushing'}>
          {#each tags as option (option)}
            <NativeSelect.Option value={option}>{option}</NativeSelect.Option>
          {/each}
        </NativeSelect.Root>
        {#if authenticated.value === false}
          <Field.Description>
            <span class="flex items-center gap-1.5 text-state-warning">
              <TriangleAlertIcon class="size-3.5" />
              No credentials for the registry of this tag: the push may be denied.
            </span>
          </Field.Description>
        {:else if authenticated.value}
          <Field.Description>
            <span class="flex items-center gap-1.5">
              <CircleCheckIcon class="size-3.5 text-state-success" />
              Logged in to the registry of this tag.
            </span>
          </Field.Description>
        {/if}
      </Field.Field>
      {#if status !== 'idle'}
        <div class="max-h-48 overflow-y-auto rounded-md bg-terminal p-2 font-mono text-xs text-terminal-foreground" aria-live="polite">
          {#each Object.entries(layers) as [id, layerStatus] (id)}
            <p>{id}: {layerStatus}</p>
          {/each}
          {#each messages as message, index (index)}
            <p class={status === 'failed' && index === messages.length - 1 ? 'text-destructive' : undefined}>{message}</p>
          {/each}
        </div>
      {/if}
    </Dialog.Body>
    <Dialog.Footer>
      {#if status === 'pushed'}
        <Button onclick={onClose}>Done</Button>
      {:else}
        <Button variant="outline" onclick={onClose}>{status === 'pushing' ? 'Close' : 'Cancel'}</Button>
        <Button disabled={!tag || status === 'pushing'} onclick={push}>
          {#if status === 'pushing'}
            <Spinner data-icon="inline-start" />
            Pushing
          {:else}
            {status === 'failed' ? 'Push again' : 'Push'}
          {/if}
        </Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
