<script lang="ts">
import BoxIcon from '@lucide/svelte/icons/box';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import NotificationCard from '#lib/components/notification/NotificationCard.svelte';
import Page from '#lib/components/Page.svelte';
import StatCard from '#lib/components/StatCard.svelte';
import StatusDot from '#lib/components/StatusDot.svelte';
import * as Empty from '#lib/components/ui/empty/index.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

function openEngine(engineId: string): void {
  view.open(viewRef('engine', { engineId }));
}
</script>

<Page icon={LayoutDashboardIcon} title="Dashboard">
  <div class="flex flex-col gap-3 p-3">
    {#if app.notifications.highlighted.length}
      <!-- the three first notifications: the next ones show as these are dismissed -->
      <section class="flex flex-col gap-3" aria-label="Notifications">
        {#each app.notifications.highlighted.slice(0, 3) as notification (notification.id)}
          <NotificationCard {notification} onDismiss={(): void => app.notifications.dismiss(notification)} />
        {/each}
      </section>
    {/if}
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={BoxIcon}
        label="Containers"
        value={app.containers.items.length}
        detail="{app.containers.running} running" />
      <StatCard icon={ServerIcon} label="Engines" value={app.engines.all.length} />
    </section>
    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Engines</h2>
      {#each app.engines.all as engine (engine.id)}
        <button
          class="flex items-center gap-3 rounded-lg bg-card px-4 py-3 text-left outline-none hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring"
          onclick={(): void => openEngine(engine.id)}>
          <StatusDot decorative status={engine.status} />
          <span class="flex flex-col">
            <span class="font-medium">{engine.name}</span>
            <span class="text-xs text-muted-foreground">{engine.providerName} · {engine.status}</span>
          </span>
          <span class="ms-auto text-muted-foreground tabular-nums">
            {app.containers.ofEngine(engine.id).length} containers
          </span>
        </button>
      {:else}
        {#if app.engines.loaded}
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon">
                <ServerIcon />
              </Empty.Media>
              <Empty.Title>No container engine</Empty.Title>
              <Empty.Description>Start Podman, or another container engine, to see its resources.</Empty.Description>
            </Empty.Header>
          </Empty.Root>
        {/if}
      {/each}
    </section>
  </div>
</Page>
