<script lang="ts">
import type { ContainerInspectInfo } from '@desktop-framework/api';
import BoxIcon from '@lucide/svelte/icons/box';

import { getApp } from '#lib/app.svelte.js';
import ContainerActions from '#lib/components/container/ContainerActions.svelte';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import Page from '#lib/components/Page.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import * as Empty from '#lib/components/ui/empty/index.js';
import { age } from '#lib/format.js';
import { containerName, shortId } from '#lib/stores/containers.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let container = $derived(app.containers.get(view.params.engineId, view.params.containerId));
let engine = $derived(app.engines.get(view.params.engineId));

// the networks, the mounts and the environment are only in the inspect data: reloaded when the state changes
let inspect: ContainerInspectInfo | undefined = $state.raw();
$effect(() => {
  if (!container?.State) {
    return;
  }
  window
    .getContainerInspect(view.params.engineId, view.params.containerId)
    .then(info => (inspect = info))
    .catch((error: unknown) => console.error('Error inspecting the container', error));
});

// the Kubernetes YAML is generated the first time the Kube section is shown
let kube: string | undefined = $state();
$effect(() => {
  if (view.state.section !== 'kube' || kube !== undefined) {
    return;
  }
  window
    .generatePodmanKube(view.params.engineId, [view.params.containerId])
    .then(yaml => (kube = yaml))
    .catch((error: unknown) => (kube = `# Error generating the Kubernetes YAML: ${String(error)}`));
});

let details: KeyValue[] = $derived(
  container
    ? [
        { label: 'Name', value: containerName(container) },
        { label: 'ID', value: container.Id, mono: true },
        { label: 'Engine', value: engine ? `${engine.providerName} · ${engine.name}` : container.engineName },
        { label: 'Image', value: container.Image },
        { label: 'Command', value: container.Command ?? '', mono: true },
        { label: 'Created', value: `${age(container.Created)} ago` },
        { label: 'Started', value: container.StartedAt ? `${age(container.StartedAt)} ago` : '' },
        { label: 'Restart policy', value: inspect?.HostConfig.RestartPolicy?.Name ?? '' },
      ]
    : [],
);

let networking: KeyValue[] = $derived([
  {
    label: 'Ports',
    value: (container?.Ports ?? [])
      .filter(port => port.PublicPort)
      .map(port => `${port.PublicPort} → ${port.PrivatePort}/${port.Type}`)
      .join(', '),
  },
  { label: 'Networks', value: Object.keys(inspect?.NetworkSettings.Networks ?? {}).join(', ') },
  {
    label: 'Mounts',
    value: (inspect?.Mounts ?? []).map(mount => `${mount.Name ?? mount.Source}:${mount.Destination}`).join(', '),
  },
]);

let labels: KeyValue[] = $derived(Object.entries(container?.Labels ?? {}).map(([label, value]) => ({ label, value })));

let environment: KeyValue[] = $derived(
  (inspect?.Config.Env ?? []).map(variable => {
    const [label, ...value] = variable.split('=');
    return { label, value: value.join('='), mono: true };
  }),
);
</script>

<Page
  icon={BoxIcon}
  title={container ? containerName(container) : shortId(view.params.containerId)}
  body={view.state.section === 'summary' ? 'scroll' : 'fill'}>
  {#snippet meta()}
    {#if container}
      <StatusBadge status={container.State} />
      <EngineBadge engineId={view.params.engineId} />
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if container}
      <SegmentedControl
        label="Section"
        bind:value={view.state.section}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'inspect', label: 'Inspect' },
          { value: 'kube', label: 'Kube' },
        ]} />
      <ContainerActions {container} placement="header" />
    {/if}
  {/snippet}
  {#if container}
    {#if view.state.section === 'summary'}
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={details} />
        <KeyValueCard title="Networking & storage" rows={networking} />
        <KeyValueCard title="Labels ({labels.length})" rows={labels} empty="No labels" />
        <KeyValueCard title="Environment ({environment.length})" rows={environment} empty="No variables" />
      </div>
    {:else if view.state.section === 'inspect'}
      <CodeEditor language="json" value={inspect ? JSON.stringify(inspect, undefined, 2) : ''} />
    {:else}
      <CodeEditor language="yaml" value={kube ?? ''} />
    {/if}
  {:else if app.containers.loaded}
    <Empty.Root>
      <Empty.Header>
        <Empty.Title>Container not found</Empty.Title>
        <Empty.Description>It may have been deleted.</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  {/if}
</Page>
