<script lang="ts">
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import { connectionActions } from '#lib/components/engine/connection-actions.js';
import { connectionDetails, kindLabel } from '#lib/components/engine/connection-details.js';
import KeyValueCard from '#lib/components/KeyValueCard.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { Badge } from '#lib/components/ui/badge/index.js';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// a Kubernetes cluster or a virtual machine of a provider: what the provider tells about it (v2 has no views of
// their resources)
const app = getApp();

let connection = $derived(app.engines.connection(view.params.connectionId));
let set = $derived(connection ? connectionActions(connection) : undefined);
</script>

<Page icon={ServerIcon} title={connection?.name ?? view.params.connectionId}>
  {#snippet meta()}
    {#if connection}
      <StatusBadge
        status={connection.info.status}
        actionKey={resourceKey('connection', connection.provider.id, connection.id)} />
      <Badge variant="outline">{kindLabel(connection)}</Badge>
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if set}
      <ResourceActions target={set.target} actions={set.actions} max={6} size="icon" />
    {/if}
  {/snippet}
  {#if connection}
    <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
      <KeyValueCard title="Details" rows={[{ label: 'Name', value: connection.name }, ...connectionDetails(connection)]} />
    </div>
  {:else if app.engines.loaded}
    <NotFound noun="Connection" />
  {/if}
</Page>
