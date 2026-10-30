<script lang="ts">
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
import CircleXIcon from '@lucide/svelte/icons/circle-x';
import PlusIcon from '@lucide/svelte/icons/plus';
import ServerCogIcon from '@lucide/svelte/icons/server-cog';
import { untrack } from 'svelte';

import { getApp } from '#lib/app.svelte.js';
import Card from '#lib/components/Card.svelte';
import { ConnectionForm, creationLabel } from '#lib/components/engine/connection-form.svelte.js';
import ConnectionFields from '#lib/components/engine/ConnectionFields.svelte';
import Page from '#lib/components/Page.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import type { Creation } from '#lib/stores/creations.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// creates a connection with a provider (e.g. a Podman machine, a kind cluster): the form keeps its values while it
// runs and after it (a failure loses nothing, Create again retries), the output of the provider is a session of the panel
const app = getApp();

let provider = $derived(app.engines.providers.find(item => item.id === view.params.providerId));
let label = $derived(provider ? creationLabel(provider, view.params.kind) : 'resource');
const form = new ConnectionForm(
  app,
  () => provider,
  untrack(() => view.params.kind),
);
let creation: Creation | undefined = $state();

let running = $derived(creation?.status === 'running');
// the connection created: the one of the provider and the kind appearing after the creation started
let created = $derived(
  creation?.status === 'succeeded'
    ? app.engines.connections.find(
        connection =>
          connection.provider.id === view.params.providerId &&
          connection.kind === view.params.kind &&
          !creation?.before.includes(connection.id),
      )
    : undefined,
);

function create(): void {
  if (!provider || running) {
    return;
  }
  creation = app.creations.start({ provider, kind: view.params.kind, label, params: form.params(false) });
  showOutput();
}

function showOutput(): void {
  if (creation) {
    app.workbench.open(viewRef('creation-output', { creationId: creation.id }));
  }
}

function openCreated(): void {
  if (created) {
    view.open(
      created.engineId
        ? viewRef('engine', { engineId: created.engineId })
        : viewRef('connection', { connectionId: created.id }),
    );
  }
}
</script>

<Page icon={ServerCogIcon} title="Create a {label}">
  {#snippet meta()}
    {#if provider}<span class="text-muted-foreground">{provider.name}</span>{/if}
  {/snippet}
  {#snippet actions()}
    {#if running}
      <Button
        variant="outline"
        onclick={(): void => {
          creation?.cancel().catch(console.error);
        }}>
        <CircleStopIcon data-icon="inline-start" />
        Cancel
      </Button>
    {/if}
    <Button disabled={!provider || !form.loaded || form.invalid || running} onclick={create}>
      {#if running}
        <Spinner data-icon="inline-start" />
        Creating
      {:else}
        <PlusIcon data-icon="inline-start" />
        Create
      {/if}
    </Button>
  {/snippet}
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    {#if creation}
      <!-- the last creation of this form -->
      <div class="flex items-center gap-2 rounded-lg border px-4 py-2.5" role="status">
        {#if creation.status === 'running'}
          <Spinner />
          <span class="flex-1">Creating the {label}…</span>
        {:else if creation.status === 'succeeded'}
          <CircleCheckIcon class="size-4 text-state-success" />
          <span class="flex-1">{created ? `${created.name} created.` : `The ${label} is created.`}</span>
          {#if created}
            <Button variant="outline" size="sm" onclick={openCreated}>Open it</Button>
          {/if}
        {:else if creation.status === 'failed'}
          <CircleXIcon class="size-4 text-state-error" />
          <span class="min-w-0 flex-1 truncate text-state-error" title={creation.error}>
            The creation failed: {creation.error}
          </span>
        {:else}
          <CircleStopIcon class="size-4 text-muted-foreground" />
          <span class="flex-1">The creation was canceled.</span>
        {/if}
        <Button variant="ghost" size="sm" onclick={showOutput}>Output</Button>
      </div>
    {/if}
    <Card title="{label} settings">
      <ConnectionFields {form} providerName={provider?.name ?? ''} disabled={running} />
    </Card>
  </div>
</Page>
