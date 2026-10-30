<script lang="ts">
import { getApp } from '#lib/app.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';

import { extensionKey, installAction } from './actions.js';

interface Props {
  onClose: () => void;
}

// installs an extension from an image: closed at once, so it does not cover the dialogs the installer may show (e.g.
// to replace a bundled extension); the installation is reported by its task
let { onClose }: Props = $props();

const app = getApp();

let image = $state('');
let trimmed = $derived(image.trim());

function install(): void {
  app.actions
    .run({ key: extensionKey(trimmed), name: trimmed }, installAction(trimmed, trimmed))
    .catch((error: unknown) => console.error(`Error installing ${trimmed}`, error));
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
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Install an extension</Dialog.Title>
      <Dialog.Description>From its OCI image. An extension runs with the access of Podman Desktop.</Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        if (trimmed) {
          install();
        }
      }}>
      <Dialog.Body>
        <Field.Field>
          <Field.Label for="extension-image">OCI image</Field.Label>
          <Input id="extension-image" bind:value={image} placeholder="quay.io/namespace/my-extension" />
        </Field.Field>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!trimmed}>Install</Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
