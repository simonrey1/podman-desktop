<script lang="ts">
import type { SystemOverviewStatusInfo } from '@desktop-framework/api';
import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

import { subscribe } from '#lib/api/events.js';
import { getApp } from '#lib/app.svelte.js';
import { type Connection, type ConnectionKind, PROVIDER_EVENTS } from '#lib/stores/engines.svelte.js';

import ConnectionRow from './ConnectionRow.svelte';

interface Props {
  onOpen: (connection: Connection) => void;
}

// the connections of the providers, by kind, and the health of the system
let { onOpen }: Props = $props();

const app = getApp();

const KINDS: { kind: ConnectionKind; title: string }[] = [
  { kind: 'container', title: 'Container engines' },
  { kind: 'kubernetes', title: 'Kubernetes' },
  { kind: 'vm', title: 'Virtual machines' },
];

let groups = $derived(
  KINDS.map(group => ({
    ...group,
    connections: app.engines.connections.filter(item => item.kind === group.kind),
  })).filter(group => group.connections.length),
);

// the health of the system, computed by the main process, again when a provider changes
let health: SystemOverviewStatusInfo | undefined = $state.raw();
$effect(() => {
  const read = (): void => {
    window
      .getDashboardSystemOverviewStatus()
      .then(status => {
        health = status;
      })
      .catch((error: unknown) => console.error('Error reading the health of the system', error));
  };
  read();
  return subscribe(PROVIDER_EVENTS, read);
});

let healthy = $derived(health?.status === 'healthy' || health?.status === 'stable');
</script>

<section class="flex flex-col gap-2" aria-label="System overview">
  <div class="flex items-center gap-3">
    <h2 class="text-lg font-semibold">System overview</h2>
    {#if health}
      <span
        class={[
          'flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm',
          healthy && 'bg-state-success/10 text-state-success',
          health.status === 'progressing' && 'bg-muted text-muted-foreground',
          health.status === 'critical' && 'bg-destructive/10 text-destructive',
        ]}
        role="status">
        {#if health.status === 'progressing'}
          <LoaderCircleIcon class="size-4 animate-spin" />
        {:else if healthy}
          <CircleCheckIcon class="size-4" />
        {:else}
          <CircleAlertIcon class="size-4" />
        {/if}
        {health.text}
      </span>
    {/if}
  </div>
  {#each groups as group (group.kind)}
    <h3 class="mt-1 text-sm font-medium text-muted-foreground">{group.title}</h3>
    <div class="flex flex-col gap-2">
      {#each group.connections as connection (connection.id)}
        <ConnectionRow {connection} onOpen={(): void => onOpen(connection)} />
      {/each}
    </div>
  {:else}
    {#if app.engines.loaded}
      <p class="text-muted-foreground">No resources: the extensions add them (e.g. Podman, Kind).</p>
    {/if}
  {/each}
</section>
