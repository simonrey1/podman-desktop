<script lang="ts">
import type { NetworkInspectInfo } from '@desktop-framework/api';
import NetworkIcon from '@lucide/svelte/icons/network';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import NetworkActions from '#lib/components/network/NetworkActions.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import ResourceLinksCard, { type ResourceLink } from '#lib/components/ResourceLinksCard.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { age } from '#lib/format.js';
import { shortId } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let network = $derived(app.networks.get(view.params.engineId, view.params.networkId));
let members = $derived(Object.entries(network?.Containers ?? {}));

const inspect = new AsyncValue<NetworkInspectInfo>(() =>
  view.state.section === 'inspect' ? window.inspectNetwork(view.params.engineId, view.params.networkId) : undefined,
);

function yesNo(value: boolean | undefined): string {
  return value ? 'Yes' : 'No';
}

let details: KeyValue[] = $derived(
  network
    ? [
        { label: 'Name', value: network.Name },
        { label: 'ID', value: network.Id, mono: true },
        { label: 'Engine', value: app.engines.label(network.engineId, network.engineName) },
        { label: 'Driver', value: network.Driver },
        { label: 'Scope', value: network.Scope },
        { label: 'Created', value: network.Created ? `${age(network.Created)} ago` : '' },
        { label: 'Internal', value: yesNo(network.Internal) },
        { label: 'IPv6', value: yesNo(network.EnableIPv6) },
      ]
    : [],
);

let addressing: KeyValue[] = $derived(
  (network?.IPAM?.Config ?? []).flatMap((config, index) => [
    { label: `Subnet ${index + 1}`, value: config.Subnet ?? '', mono: true },
    { label: `Gateway ${index + 1}`, value: config.Gateway ?? '', mono: true },
  ]),
);

let containers: ResourceLink[] = $derived(
  members.map(([id, member]) => ({
    id,
    label: member.Name,
    status: app.containers.get(view.params.engineId, id)?.State,
    detail: member.IPv4Address || member.IPv6Address,
    ref: viewRef('container-details', { engineId: view.params.engineId, containerId: id }),
  })),
);

let labels: KeyValue[] = $derived(Object.entries(network?.Labels ?? {}).map(([label, value]) => ({ label, value })));
</script>

<Page
  icon={NetworkIcon}
  title={network?.Name ?? shortId(view.params.networkId)}
  body={view.state.section === 'summary' ? 'scroll' : 'fill'}>
  {#snippet meta()}
    {#if network}
      <StatusBadge status={members.length ? 'used' : 'unused'} />
      <EngineBadge engineId={view.params.engineId} />
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if network}
      <SegmentedControl
        label="Section"
        bind:value={view.state.section}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'inspect', label: 'Inspect' },
        ]} />
      <NetworkActions {network} placement="header" />
    {/if}
  {/snippet}
  {#if network}
    {#if view.state.section === 'summary'}
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={details} />
        <ResourceLinksCard
          title="Containers ({containers.length})"
          items={containers}
          empty="No container uses this network"
          onOpen={(ref): void => view.open(ref)} />
        <KeyValueCard title="Addressing" rows={addressing} empty="No subnet" />
        <KeyValueCard title="Labels ({labels.length})" rows={labels} empty="No labels" />
      </div>
    {:else}
      <CodeEditor language="json" value={inspect.value ? JSON.stringify(inspect.value, undefined, 2) : ''} />
    {/if}
  {:else if app.networks.loaded}
    <NotFound noun="Network" />
  {/if}
</Page>
