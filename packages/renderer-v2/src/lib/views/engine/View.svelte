<script lang="ts">
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import { connectionActions } from '#lib/components/engine/connection-actions.svelte.js';
import { connectionDetails } from '#lib/components/engine/connection-details.js';
import { ConnectionUsage } from '#lib/components/engine/connection-usage.svelte.js';
import UsageCard from '#lib/components/engine/UsageCard.svelte';
import KeyValueCard from '#lib/components/KeyValueCard.svelte';
import Page from '#lib/components/Page.svelte';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import StatCard from '#lib/components/StatCard.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { explorerEntries } from '#lib/shell/explorer.js';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// a container engine: its resources, the details of its connection, its usage and its lifecycle
const app = getApp();

let engine = $derived(app.engines.get(view.params.engineId));
let connection = $derived(app.engines.connections.find(item => item.engineId === view.params.engineId));
// the resources of the engine, without its overview (this view)
let sections = $derived(explorerEntries(app, view.params.engineId).filter(entry => entry.count !== undefined));
let set = $derived(connection ? connectionActions(connection, app) : undefined);
const usage = new ConnectionUsage(app, () =>
  connection?.info.connectionType === 'container' ? connection.info : undefined,
);
</script>

<Page icon={ServerIcon} title={engine?.name ?? view.params.engineId}>
  {#snippet meta()}
    {#if engine}
      <StatusBadge
        status={engine.status}
        actionKey={connection ? resourceKey('connection', connection.provider.id, connection.id) : undefined} />
      <!-- the same header as the other connections: their provider and their kind -->
      <span class="text-muted-foreground">{engine.providerName} · Container engine</span>
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if set}
      <ResourceActions target={set.target} actions={set.actions} max={6} size="icon" />
    {/if}
  {/snippet}
  <div class="flex flex-col gap-3 p-3">
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {#each sections as section (section.id)}
        <StatCard
          icon={section.icon}
          label={section.label}
          value={section.count ?? 0}
          onclick={(): void => view.open(section.ref)} />
      {/each}
    </section>
    {#if connection}
      <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={connectionDetails(connection)} />
        {#if usage.metrics}
          <UsageCard metrics={usage.metrics} />
        {/if}
      </div>
    {/if}
  </div>
</Page>
