<script lang="ts">
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { Badge } from '#lib/components/ui/badge/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// a Kubernetes cluster or a virtual machine of a provider: what the provider tells about it (v2 has no views of
// their resources)
const app = getApp();

const KINDS = { container: 'Container engine', kubernetes: 'Kubernetes cluster', vm: 'Virtual machine' };

let connection = $derived(app.engines.connection(view.params.connectionId));

let details: KeyValue[] = $derived.by(() => {
  if (!connection) {
    return [];
  }
  const { info, provider } = connection;
  return [
    { label: 'Name', value: connection.name },
    { label: 'Kind', value: KINDS[info.connectionType] },
    { label: 'Provider', value: provider.version ? `${provider.name} ${provider.version}` : provider.name },
    { label: 'Status', value: info.status.charAt(0).toUpperCase() + info.status.slice(1) },
    ...(info.connectionType === 'kubernetes' ? [{ label: 'API server', value: info.endpoint.apiURL, mono: true }] : []),
    ...(info.error ? [{ label: 'Error', value: info.error }] : []),
  ];
});
</script>

<Page icon={ServerIcon} title={connection?.name ?? view.params.connectionId}>
  {#snippet meta()}
    {#if connection}
      <StatusBadge status={connection.info.status} />
      <Badge variant="outline">{KINDS[connection.kind]}</Badge>
    {/if}
  {/snippet}
  {#if connection}
    <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
      <KeyValueCard title="Details" rows={details} />
    </div>
  {:else if app.engines.loaded}
    <NotFound noun="Connection" />
  {/if}
</Page>
