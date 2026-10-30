<script lang="ts">
import type { SystemOverviewStatusInfo } from '@desktop-framework/api';
import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
import PlusIcon from '@lucide/svelte/icons/plus';

import { subscribe } from '#lib/api/events.js';
import { getApp } from '#lib/app.svelte.js';
import ImageIcon from '#lib/components/ImageIcon.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
import { iconOf } from '#lib/stores/accessories.svelte.js';
import { type Connection, type ConnectionKind, PROVIDER_EVENTS } from '#lib/stores/engines.svelte.js';
import { viewRef } from '#lib/views/index.js';

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

// what the providers can create: a Podman machine, a kind cluster, a VM...
let creatable = $derived(
  app.engines.providers.flatMap(provider =>
    (
      [
        [
          'container',
          provider.containerProviderConnectionCreation,
          provider.containerProviderConnectionCreationDisplayName,
        ],
        [
          'kubernetes',
          provider.kubernetesProviderConnectionCreation,
          provider.kubernetesProviderConnectionCreationDisplayName,
        ],
        ['vm', provider.vmProviderConnectionCreation, provider.vmProviderConnectionCreationDisplayName],
      ] as const
    )
      .filter(([, can]) => can)
      .map(([kind, , label]) => ({ provider, kind, label: label ?? provider.name })),
  ),
);

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
          health.status === 'critical' && 'bg-destructive/10 text-state-error',
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
    {#if creatable.length}
      <div class="ms-auto">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button {...props} variant="outline" size="sm">
                <PlusIcon data-icon="inline-start" />
                Add resource
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            {#each creatable as item (`${item.provider.id}:${item.kind}`)}
              {@const icon = iconOf(item.provider.images)}
              <DropdownMenu.Item
                onSelect={(): void =>
                  app.workbench.open(viewRef('connection-create', { providerId: item.provider.id, kind: item.kind }))}>
                {#if icon}<ImageIcon {icon} class="size-4" />{/if}
                {item.label}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
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
