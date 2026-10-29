<script lang="ts">
import type { ImageInfo } from '@desktop-framework/api';
import { untrack } from 'svelte';

import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { imageName, imageRepositoryAndTag } from '#lib/stores/images.svelte.js';

interface Props {
  image: ImageInfo;
  onClose: () => void;
}

// renames an image: tags it with the new name, then removes the old one (an image without a name is only tagged)
let { image, onClose }: Props = $props();

let named = $derived(imageName(image) !== '<none>');
let current = $derived(imageRepositoryAndTag(image));

let name = $state(untrack(() => (named ? current.repository : '')));
let tag = $state(untrack(() => (named ? current.tag || 'latest' : 'latest')));
let saving = $state(false);
let error: string | undefined = $state();

let unchanged = $derived(named && name.trim() === current.repository && tag.trim() === current.tag);

async function save(): Promise<void> {
  saving = true;
  error = undefined;
  // the image is renamed from its current name, or its ID when it has none
  const source = named ? imageName(image) : image.Id;
  try {
    await window.tagImage(image.engineId, source, name.trim(), tag.trim());
    if (named) {
      await window.deleteImage(image.engineId, source);
    }
    onClose();
  } catch (err: unknown) {
    error = errorMessage(err);
  } finally {
    saving = false;
  }
}
</script>

<Dialog.Root
  open
  onOpenChange={(open): void => {
    if (!open) {
      onClose();
    }
  }}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Edit image</Dialog.Title>
      <Dialog.Description>Renames the image: the old name is removed.</Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        save().catch(console.error);
      }}>
      <Dialog.Body>
        <Field.Group>
          <Field.Field data-invalid={!name.trim() || undefined}>
            <Field.Label for="image-name">Name</Field.Label>
            <Input id="image-name" bind:value={name} placeholder="quay.io/namespace/my-image" aria-invalid={!name.trim()} />
          </Field.Field>
          <Field.Field data-invalid={!tag.trim() || undefined}>
            <Field.Label for="image-tag">Tag</Field.Label>
            <Input id="image-tag" bind:value={tag} placeholder="latest" aria-invalid={!tag.trim()} />
          </Field.Field>
          {#if error}
            <Field.Error>{error}</Field.Error>
          {/if}
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving || unchanged || !name.trim() || !tag.trim()}>
          {#if saving}
            <Spinner data-icon="inline-start" />
          {/if}
          Save
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
