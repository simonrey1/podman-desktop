<script lang="ts">
import type { ContainerInspectInfo } from '@desktop-framework/api';
import BlocksIcon from '@lucide/svelte/icons/blocks';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import { COMPOSE_PROJECT_LABEL, composeActions } from '#lib/components/compose/actions.js';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import ResourceActions from '#lib/components/ResourceActions.svelte';
import ResourceLinksCard, { type ResourceLink } from '#lib/components/ResourceLinksCard.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { age } from '#lib/format.js';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import { containerName, shortId } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { groupStatus } from '../shared.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// a Compose project: the containers of the engine with its label
const app = getApp();

let containers = $derived(
  app.containers
    .ofEngine(view.params.engineId)
    .filter(container => container.Labels?.[COMPOSE_PROJECT_LABEL] === view.params.project),
);
let running = $derived(containers.filter(container => container.State === 'running').length);
let status = $derived(groupStatus(running, containers.length));
let set = $derived(composeActions(view.params.engineId, view.params.project, running, containers.length, app));
// the containers and their states, as a key: the inspect data is loaded again when one of them changes
let states = $derived(containers.map(container => `${container.Id}:${container.State}`).join(','));

const inspect = new AsyncValue<ContainerInspectInfo[]>(() => {
  if (view.state.section !== 'inspect' || !states) {
    return undefined;
  }
  const ids = states.split(',').map(entry => entry.substring(0, entry.indexOf(':')));
  return Promise.all(ids.map(id => window.getContainerInspect(view.params.engineId, id)));
});

// the Kubernetes YAML of the containers, generated each time the Kube section is shown (or the containers change)
let ids = $derived(containers.map(container => container.Id).join(','));
const kube = new AsyncValue<string>(() =>
  view.state.section === 'kube' && ids ? window.generatePodmanKube(view.params.engineId, ids.split(',')) : undefined,
);

let details: KeyValue[] = $derived([
  { label: 'Project', value: view.params.project },
  { label: 'Engine', value: app.engines.label(view.params.engineId, view.params.engineId) },
  { label: 'Containers', value: `${running} of ${containers.length} running` },
  {
    label: 'Created',
    value: containers.length ? `${age(Math.min(...containers.map(container => container.Created)))} ago` : '',
  },
  // the Compose file is a label of the containers
  {
    label: 'Compose file',
    value: containers[0]?.Labels?.['com.docker.compose.project.config_files'] ?? '',
    mono: true,
  },
  { label: 'Directory', value: containers[0]?.Labels?.['com.docker.compose.project.working_dir'] ?? '', mono: true },
]);

let links: ResourceLink[] = $derived(
  containers.map(container => ({
    id: container.Id,
    label: containerName(container),
    status: container.State,
    detail: container.Labels?.['com.docker.compose.service'] ?? shortId(container.Id),
    ref: viewRef('container-details', { engineId: view.params.engineId, containerId: container.Id }),
  })),
);
</script>

<Page icon={BlocksIcon} title={view.params.project} body={view.state.section === 'summary' ? 'scroll' : 'fill'}>
  {#snippet meta()}
    {#if containers.length}
      <StatusBadge status={status} actionKey={resourceKey('compose', view.params.engineId, view.params.project)} />
      <EngineBadge engineId={view.params.engineId} />
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if containers.length}
      <SegmentedControl
        label="Section"
        bind:value={view.state.section}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'inspect', label: 'Inspect' },
          { value: 'kube', label: 'Kube' },
        ]} />
      <ResourceActions target={set.target} actions={set.actions} max={6} size="icon" />
    {/if}
  {/snippet}
  {#if containers.length}
    {#if view.state.section === 'summary'}
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={details} />
        <ResourceLinksCard
          title="Containers ({links.length})"
          items={links}
          empty="No containers"
          onOpen={(ref): void => view.open(ref)} />
      </div>
    {:else if view.state.section === 'inspect'}
      <CodeEditor language="json" value={inspect.value ? JSON.stringify(inspect.value, undefined, 2) : ''} />
    {:else}
      <CodeEditor
        language="yaml"
        value={kube.error ? `# Error generating the Kubernetes YAML: ${kube.error}` : (kube.value ?? '')} />
    {/if}
  {:else if app.containers.loaded}
    <NotFound noun="Compose project" />
  {/if}
</Page>
