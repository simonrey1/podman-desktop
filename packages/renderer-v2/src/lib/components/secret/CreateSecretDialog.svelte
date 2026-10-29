<script lang="ts">
import { getApp } from '#lib/app.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { Textarea } from '#lib/components/ui/textarea/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';

interface Props {
  /** the engine keeping the secret */
  engineId: string;
  onClose: () => void;
}

// creates a secret on the engine: its data cannot be read back once created
let { engineId, onClose }: Props = $props();

const app = getApp();

let name = $state('');
let data = $state('');
let creating = $state(false);
let error: string | undefined = $state();

async function create(): Promise<void> {
  const connection = app.engines.get(engineId)?.connection;
  if (!connection) {
    error = 'The engine is not available';
    return;
  }
  creating = true;
  error = undefined;
  try {
    const created = await window.createSecret({ name: name.trim(), data, provider: $state.snapshot(connection) });
    onClose();
    app.workbench.open(viewRef('secret-details', { engineId: created.engineId, secretId: created.id }));
  } catch (err: unknown) {
    error = errorMessage(err);
  } finally {
    creating = false;
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
      <Dialog.Title>Create a secret</Dialog.Title>
      <Dialog.Description>On {app.engines.label(engineId, engineId)}. Its data cannot be read back.</Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        create().catch(console.error);
      }}>
      <Dialog.Body>
        <Field.Group>
          <Field.Field>
            <Field.Label for="secret-name">Name</Field.Label>
            <Input id="secret-name" bind:value={name} placeholder="my-secret" autocomplete="off" />
          </Field.Field>
          <Field.Field>
            <Field.Label for="secret-data">Data</Field.Label>
            <Textarea id="secret-data" bind:value={data} rows={4} spellcheck={false} />
          </Field.Field>
          {#if error}
            <Field.Error>{error}</Field.Error>
          {/if}
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={creating || !name.trim() || !data}>
          {#if creating}
            <Spinner data-icon="inline-start" />
          {/if}
          Create
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
