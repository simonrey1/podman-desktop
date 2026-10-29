<script lang="ts">
import type { PodInspectInfo } from '@desktop-framework/api';
import BoxesIcon from '@lucide/svelte/icons/boxes';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import PodActions from '#lib/components/pod/PodActions.svelte';
import ResourceLinksCard, { type ResourceLink } from '#lib/components/ResourceLinksCard.svelte';
import type { SearchTarget } from '#lib/components/search/search.js';
import SearchField from '#lib/components/search/SearchField.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { age } from '#lib/format.js';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import { shortId } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

// the search of the editor of the Inspect / Kube sections, while one is shown
let search: SearchTarget | undefined = $state.raw();

let pod = $derived(app.pods.get(view.params.engineId, view.params.podId));

// reloaded when the status of the pod changes
const inspect = new AsyncValue<PodInspectInfo>(() =>
  pod?.Status ? window.getPodInspect(view.params.engineId, view.params.podId) : undefined,
);

// the Kubernetes YAML is generated each time the Kube section is shown
const kube = new AsyncValue<string>(() =>
  view.state.section === 'kube' ? window.generatePodmanKube(view.params.engineId, [view.params.podId]) : undefined,
);

let details: KeyValue[] = $derived(
  pod
    ? [
        { label: 'Name', value: pod.Name },
        { label: 'ID', value: pod.Id, mono: true },
        { label: 'Engine', value: app.engines.label(pod.engineId, pod.engineName) },
        { label: 'Status', value: pod.Status },
        { label: 'Created', value: `${age(pod.Created)} ago` },
        { label: 'Networks', value: pod.Networks?.join(', ') ?? '' },
        { label: 'Infra container', value: pod.InfraId ? shortId(pod.InfraId) : '', mono: true },
      ]
    : [],
);

let containers: ResourceLink[] = $derived(
  (pod?.Containers ?? []).map(container => ({
    id: container.Id,
    label: container.Names,
    status: container.Status,
    detail: shortId(container.Id),
    ref: viewRef('container-details', { engineId: view.params.engineId, containerId: container.Id }),
  })),
);

let labels: KeyValue[] = $derived(Object.entries(pod?.Labels ?? {}).map(([label, value]) => ({ label, value })));
</script>

<Page
  icon={BoxesIcon}
  title={pod?.Name ?? shortId(view.params.podId)}
  body={view.state.section === 'summary' ? 'scroll' : 'fill'}>
  {#snippet meta()}
    {#if pod}
      <StatusBadge status={pod.Status} actionKey={resourceKey('pod', pod.engineId, pod.Id)} />
      <EngineBadge engineId={view.params.engineId} />
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if pod}
      {#if search}
        <SearchField target={search} />
      {/if}
      <SegmentedControl
        label="Section"
        bind:value={view.state.section}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'inspect', label: 'Inspect' },
          { value: 'kube', label: 'Kube' },
        ]} />
      <PodActions {pod} placement="header" />
    {/if}
  {/snippet}
  {#if pod}
    {#if view.state.section === 'summary'}
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={details} />
        <ResourceLinksCard
          title="Containers ({containers.length})"
          items={containers}
          empty="No containers"
          onOpen={(ref): void => view.open(ref)} />
        <KeyValueCard title="Labels ({labels.length})" rows={labels} empty="No labels" />
      </div>
    {:else if view.state.section === 'inspect'}
      <CodeEditor bind:search language="json" value={inspect.value ? JSON.stringify(inspect.value, undefined, 2) : ''} />
    {:else}
      <CodeEditor
        bind:search
        language="yaml"
        value={kube.error ? `# Error generating the Kubernetes YAML: ${kube.error}` : (kube.value ?? '')} />
    {/if}
  {:else if app.pods.loaded}
    <NotFound noun="Pod" />
  {/if}
</Page>
