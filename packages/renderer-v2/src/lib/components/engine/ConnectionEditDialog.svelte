<script lang="ts">
import { untrack } from 'svelte';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import type { Connection } from '#lib/stores/engines.svelte.js';
import { viewRef } from '#lib/views/index.js';

import { ConnectionForm } from './connection-form.svelte.js';
import ConnectionFields from './ConnectionFields.svelte';

interface Props {
  connection: Connection;
  onClose: () => void;
}

// edits a connection: the fields are the settings of its provider for it, the values changed are sent, kept when it
// fails; the output of the provider is in the logs of the connection
let { connection, onClose }: Props = $props();

const app = getApp();

const target = untrack(() => connection);
const form = new ConnectionForm(app, () => target.provider, target.kind, target);

let running = $state(false);
let failure: string | undefined = $state();
let tokenId: number | undefined;

function showLogs(): void {
  app.workbench.open(viewRef('connection-logs', { connectionId: target.id }));
}

async function submit(): Promise<void> {
  running = true;
  failure = undefined;
  app.connectionLogs.begin(target.id, 'Editing');
  const logger = (_key: symbol, event: 'log' | 'warn' | 'error' | 'finish', args: string[]): void => {
    if (event !== 'finish') {
      app.connectionLogs.write(target.id, event, args.join(' '));
    }
  };
  try {
    tokenId = await window.getCancellableTokenSource();
    await window.editProviderConnectionLifecycle(
      target.provider.internalId,
      $state.snapshot(target.info) as typeof target.info,
      form.params(true),
      Symbol(target.id),
      logger,
      tokenId,
      undefined,
    );
    toast.success(`${target.name} updated`);
    onClose();
  } catch (error: unknown) {
    const message = errorMessage(error);
    if (message.includes('Execution cancelled')) {
      failure = 'Canceled';
    } else {
      // a provider can fail with the whole output of a command: its first line here, all of it in the logs
      app.connectionLogs.write(target.id, 'error', message);
      failure = message.length > 200 ? `${message.split('\n')[0]?.slice(0, 200) ?? ''}…` : message;
    }
  } finally {
    running = false;
    tokenId = undefined;
  }
}

function cancel(): void {
  if (tokenId !== undefined) {
    window.cancelToken(tokenId).catch(console.error);
  }
}
</script>

<Dialog.Root
  open
  onOpenChange={(open): void => {
    if (!open && !running) {
      onClose();
    }
  }}>
  <Dialog.Content size="md">
    <Dialog.Header>
      <Dialog.Title>Edit {target.name}</Dialog.Title>
      <Dialog.Description>Its settings, applied by {target.provider.name}.</Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        submit().catch(console.error);
      }}>
      <Dialog.Body>
        <ConnectionFields {form} providerName={target.provider.name} disabled={running} />
        {#if failure}
          <Field.Error>{failure}</Field.Error>
          <div>
            <Button variant="outline" size="sm" onclick={showLogs}>Show the logs</Button>
          </div>
        {/if}
      </Dialog.Body>
      <Dialog.Footer>
        {#if running}
          <Button variant="outline" onclick={cancel}>Cancel</Button>
        {:else}
          <Button variant="outline" onclick={onClose}>Close</Button>
        {/if}
        <Button type="submit" disabled={running || !form.loaded || form.changed.length === 0}>
          {#if running}<Spinner data-icon="inline-start" />{/if}
          Update
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
