<script lang="ts">
import type { NetworkInspectInfo } from '@desktop-framework/api';

import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';

interface Props {
  network: NetworkInspectInfo;
  onClose: () => void;
}

// adds and removes DNS servers of a Podman network
let { network, onClose }: Props = $props();

let add = $state('');
let remove = $state('');
let saving = $state(false);
let error: string | undefined = $state();

// several servers are separated by spaces or commas
function servers(value: string): string[] {
  return value.split(/[\s,]+/).filter(Boolean);
}

let unchanged = $derived(servers(add).length === 0 && servers(remove).length === 0);

async function update(): Promise<void> {
  saving = true;
  error = undefined;
  try {
    await window.updateNetwork(network.engineId, network.Id, servers(add), servers(remove));
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
      <Dialog.Title>Update DNS of {network.Name}</Dialog.Title>
      <Dialog.Description>The DNS servers the containers of the network use.</Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        update().catch(console.error);
      }}>
      <Dialog.Body>
        <Field.Group>
          <Field.Field>
            <Field.Label for="dns-add">Servers to add</Field.Label>
            <Input id="dns-add" bind:value={add} placeholder="8.8.8.8 1.1.1.1" />
            <Field.Description>Separated by spaces.</Field.Description>
          </Field.Field>
          <Field.Field>
            <Field.Label for="dns-remove">Servers to remove</Field.Label>
            <Input id="dns-remove" bind:value={remove} placeholder="8.8.8.8 1.1.1.1" />
          </Field.Field>
          {#if error}
            <Field.Error>{error}</Field.Error>
          {/if}
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving || unchanged}>
          {#if saving}
            <Spinner data-icon="inline-start" />
          {/if}
          Update
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
