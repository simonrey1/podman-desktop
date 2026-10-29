<script lang="ts">
import BoxIcon from '@lucide/svelte/icons/box';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import SystemOverview from '#lib/components/engine/SystemOverview.svelte';
import NotificationCard from '#lib/components/notification/NotificationCard.svelte';
import Page from '#lib/components/Page.svelte';
import StatCard from '#lib/components/StatCard.svelte';
import type { Connection } from '#lib/stores/engines.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

// a container engine opens its overview (its resources), another connection its details
function openConnection(connection: Connection): void {
  view.open(
    connection.engineId
      ? viewRef('engine', { engineId: connection.engineId })
      : viewRef('connection', { connectionId: connection.id }),
  );
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
      <StatCard icon={ServerIcon} label="Container engines" value={app.engines.all.length} />
    </section>
    <SystemOverview onOpen={openConnection} />
  </div>
</Page>
