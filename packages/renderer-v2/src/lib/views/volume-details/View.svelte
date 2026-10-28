<script lang="ts">
import type { VolumeInspectInfo } from '@desktop-framework/api';
import HardDriveIcon from '@lucide/svelte/icons/hard-drive';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import ResourceLinksCard, { type ResourceLink } from '#lib/components/ResourceLinksCard.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import VolumeActions from '#lib/components/volume/VolumeActions.svelte';
import { age } from '#lib/format.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let volume = $derived(app.volumes.get(view.params.engineId, view.params.volumeName));
let users = $derived(volume?.containersUsage ?? []);

const inspect = new AsyncValue<VolumeInspectInfo>(() =>
  view.state.section === 'inspect' ? window.getVolumeInspect(view.params.engineId, view.params.volumeName) : undefined,
);

let details: KeyValue[] = $derived(
  volume
    ? [
        { label: 'Name', value: volume.Name },
        { label: 'Engine', value: app.engines.label(volume.engineId, volume.engineName) },
        { label: 'Driver', value: volume.Driver },
        { label: 'Scope', value: volume.Scope },
        { label: 'Mount point', value: volume.Mountpoint, mono: true },
        { label: 'Created', value: volume.CreatedAt ? `${age(volume.CreatedAt)} ago` : '' },
      ]
    : [],
);

let containers: ResourceLink[] = $derived(
  users.map(user => {
    const container = app.containers.get(view.params.engineId, user.id);
    return {
      id: user.id,
      label: user.names.map(name => name.replace(/^\//, '')).join(', '),
      status: container?.State,
      ref: viewRef('container-details', { engineId: view.params.engineId, containerId: user.id }),
    };
  }),
);

let labels: KeyValue[] = $derived(Object.entries(volume?.Labels ?? {}).map(([label, value]) => ({ label, value })));
</script>

<Page icon={HardDriveIcon} title={view.params.volumeName} body={view.state.section === 'summary' ? 'scroll' : 'fill'}>
  {#snippet meta()}
    {#if volume}
      <StatusBadge status={users.length ? 'used' : 'unused'} />
      <EngineBadge engineId={view.params.engineId} />
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if volume}
      <SegmentedControl
        label="Section"
        bind:value={view.state.section}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'inspect', label: 'Inspect' },
        ]} />
      <VolumeActions {volume} placement="header" />
    {/if}
  {/snippet}
  {#if volume}
    {#if view.state.section === 'summary'}
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={details} />
        <ResourceLinksCard
          title="Used by ({containers.length})"
          items={containers}
          empty="No container uses this volume"
          onOpen={(ref): void => view.open(ref)} />
        <KeyValueCard title="Labels ({labels.length})" rows={labels} empty="No labels" />
      </div>
    {:else}
      <CodeEditor language="json" value={inspect.value ? JSON.stringify(inspect.value, undefined, 2) : ''} />
    {/if}
  {:else if app.volumes.loaded}
    <NotFound noun="Volume" />
  {/if}
</Page>
