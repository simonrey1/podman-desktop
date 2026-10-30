<script lang="ts">
import ServerIcon from '@lucide/svelte/icons/server';
import type { Snippet } from 'svelte';

import { getApp } from '#lib/app.svelte.js';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';

interface Props {
  connectionId: string;
  /** on the right, e.g. the search of the logs */
  actions?: Snippet;
}

// the header of a session of a connection (its terminal, its logs): the connection, which it opens, and its status
let { connectionId, actions }: Props = $props();

const app = getApp();

let connection = $derived(app.engines.connection(connectionId));

function open(): void {
  if (connection) {
    app.workbench.open(
      connection.engineId
        ? viewRef('engine', { engineId: connection.engineId })
        : viewRef('connection', { connectionId: connection.id }),
    );
  }
}
</script>

<div class="bar h-tabs items-center gap-2 px-3">
  <button
    class="flex min-w-0 items-center gap-2 rounded-sm font-medium outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
    title="Open the connection"
    onclick={open}>
    <ServerIcon class="size-4 shrink-0 text-muted-foreground" />
    <span class="truncate">{connection?.name ?? connectionId}</span>
  </button>
  {#if connection}
    <StatusBadge
      status={connection.info.status}
      actionKey={resourceKey('connection', connection.provider.id, connection.id)} />
    <span class="truncate text-muted-foreground">{connection.provider.name}</span>
  {/if}
  {#if actions}
    <div class="ms-auto flex items-center gap-1">
      {@render actions()}
    </div>
  {/if}
</div>
