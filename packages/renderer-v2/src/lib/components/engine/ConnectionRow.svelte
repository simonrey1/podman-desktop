<script lang="ts">
import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import ImageIcon from '#lib/components/ImageIcon.svelte';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import StatusDot from '#lib/components/StatusDot.svelte';
import { Badge } from '#lib/components/ui/badge/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { iconOf } from '#lib/stores/accessories.svelte.js';
import type { Connection } from '#lib/stores/engines.svelte.js';

import { connectionActions } from './connection-actions.js';
import { ConnectionUsage } from './connection-usage.svelte.js';
import UsageBars from './UsageBars.svelte';

interface Props {
  connection: Connection;
  onOpen: () => void;
}

// a connection in the system overview: its provider, its version or its VM type, its status, its usage
let { connection, onOpen }: Props = $props();

const app = getApp();

let icon = $derived(iconOf(connection.provider.images));
const usage = new ConnectionUsage(app, () =>
  connection.info.connectionType === 'container' ? connection.info : undefined,
);
let badge = $derived(
  [
    connection.info.connectionType === 'container' ? connection.info.vmType?.name : undefined,
    connection.provider.version ? `v${connection.provider.version.replace(/^v/, '')}` : undefined,
  ]
    .filter(Boolean)
    .join(' · '),
);
let set = $derived(connectionActions(connection));
// a lifecycle running on the connection: its progress replaces the status
let pending = $derived(app.actions.pending(set.target.key));
let status = $derived(connection.info.status.charAt(0).toUpperCase() + connection.info.status.slice(1));
</script>

<!-- the row opens the connection; its actions are beside the button (not inside it) -->
<div class="flex w-full items-center gap-2 rounded-lg bg-card pe-2 hover:ring-1 hover:ring-border has-focus-visible:ring-2 has-focus-visible:ring-ring">
  <button type="button" class="flex min-w-0 flex-1 items-center gap-3 py-3 ps-4 text-left outline-none" onclick={onOpen}>
    <span class="relative shrink-0">
      {#if icon}
        <ImageIcon {icon} class="size-7" />
      {:else}
        <ServerIcon class="size-7 text-muted-foreground" />
      {/if}
      <span class="absolute -top-0.5 -right-0.5 rounded-full bg-card p-px">
        {#if pending}
          <Spinner size="sm" />
        {:else}
          <StatusDot status={connection.info.status} size="sm" decorative />
        {/if}
      </span>
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex min-w-0 items-center gap-2">
        <span class="truncate font-medium">{connection.name}</span>
        {#if badge}<Badge variant="outline">{badge}</Badge>{/if}
      </span>
      {#if connection.info.error}
        <span class="truncate text-xs text-destructive" title={connection.info.error}>{connection.info.error}</span>
      {:else}
        <span class="text-xs text-muted-foreground">{connection.provider.name} · {pending?.progress ? `${pending.progress}…` : status}</span>
      {/if}
    </span>
    {#if usage.metrics}
      <UsageBars metrics={usage.metrics} />
    {/if}
  </button>
  <ResourceActions target={set.target} actions={set.actions} max={3} />
  <ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
</div>
