<script lang="ts">
import type { ContainerInspectInfo } from '@desktop-framework/api';
import BoxIcon from '@lucide/svelte/icons/box';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import ContainerActions from '#lib/components/container/ContainerActions.svelte';
import { ContainerStats } from '#lib/components/container/stats.svelte.js';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { age, bytes } from '#lib/format.js';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import { containerName, shortId } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let container = $derived(app.containers.get(view.params.engineId, view.params.containerId));

// the networks, the mounts and the environment are only in the inspect data: reloaded when the state changes
const inspectData = new AsyncValue<ContainerInspectInfo>(() =>
  container?.State ? window.getContainerInspect(view.params.engineId, view.params.containerId) : undefined,
);
let inspect = $derived(inspectData.value);

// the Kubernetes YAML is generated each time the Kube section is shown
const kube = new AsyncValue<string>(() =>
  view.state.section === 'kube'
    ? window.generatePodmanKube(view.params.engineId, [view.params.containerId])
    : undefined,
);

// streamed while the summary of a running container is shown
const stats = new ContainerStats(() => ({
  engineId: view.params.engineId,
  containerId: view.params.containerId,
  running: container?.State === 'running' && view.state.section === 'summary',
}));

let usage: KeyValue[] = $derived([
  { label: 'CPU', value: stats.cpu === undefined ? '' : `${stats.cpu.toFixed(1)}%` },
  {
    label: 'Memory',
    value: [stats.memory, stats.memoryLimit]
      .filter(value => value !== undefined)
      .map(bytes)
      .join(' of '),
  },
]);

let details: KeyValue[] = $derived(
  container
    ? [
        { label: 'Name', value: containerName(container) },
        { label: 'ID', value: container.Id, mono: true },
        { label: 'Engine', value: app.engines.label(container.engineId, container.engineName) },
        {
          label: 'Image',
          value: container.Image,
          ref: viewRef('image-details', { engineId: container.engineId, imageId: container.ImageID }),
        },
        {
          label: 'Pod',
          value: container.pod?.name ?? '',
          ref: container.pod
            ? viewRef('pod-details', { engineId: container.engineId, podId: container.pod.id })
            : undefined,
        },
        // only for the containers of a Compose project
        ...(container.Labels?.['com.docker.compose.project']
          ? [{ label: 'Compose project', value: container.Labels['com.docker.compose.project'] }]
          : []),
        { label: 'Command', value: container.Command ?? '', mono: true },
        { label: 'State', value: container.State },
        { label: 'Created', value: `${age(container.Created)} ago` },
        {
          label: 'Uptime',
          value: container.State === 'running' && container.StartedAt ? age(container.StartedAt) : '',
        },
        { label: 'Restart policy', value: inspect?.HostConfig.RestartPolicy?.Name ?? '' },
      ]
    : [],
);

// each published port opens in the browser
let ports: KeyValue[] = $derived.by(() => {
  const published = (container?.Ports ?? []).filter(port => port.PublicPort);
  if (published.length === 0) {
    return [{ label: 'Ports', value: '' }];
  }
  return published.map((port, index) => ({
    label: index === 0 ? 'Ports' : '',
    value: `localhost:${port.PublicPort} → ${port.PrivatePort}/${port.Type}`,
    href: port.Type === 'tcp' ? `http://localhost:${port.PublicPort}` : undefined,
  }));
});

let networking: KeyValue[] = $derived([
  ...ports,
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
      <StatusBadge status={container.State} actionKey={resourceKey('container', container.engineId, container.Id)} />
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
      {#if container.IsInfra}
        <p class="mx-3 mt-3 rounded-lg border bg-card px-4 py-3 text-muted-foreground">
          This is the infra container of the pod {container.pod?.name ?? ''}: it holds the namespaces shared by the
          containers of the pod.
        </p>
      {/if}
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={details} onOpen={(ref): void => view.open(ref)} />
        {#if container.State === 'running'}
          <KeyValueCard title="Usage" rows={usage} />
        {/if}
        <KeyValueCard title="Networking & storage" rows={networking} />
        <KeyValueCard title="Labels ({labels.length})" rows={labels} empty="No labels" />
        <KeyValueCard title="Environment ({environment.length})" rows={environment} empty="No variables" />
      </div>
    {:else if view.state.section === 'inspect'}
      <CodeEditor language="json" value={inspect ? JSON.stringify(inspect, undefined, 2) : ''} />
    {:else}
      <CodeEditor language="yaml" value={kube.error ? `# Error generating the Kubernetes YAML: ${kube.error}` : (kube.value ?? '')} />
    {/if}
  {:else if app.containers.loaded}
    <NotFound noun="Container" />
  {/if}
</Page>
