<script lang="ts">
import type { HistoryInfo, ImageInspectInfo } from '@desktop-framework/api';
import LayersIcon from '@lucide/svelte/icons/layers';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import DataTable from '#lib/components/data-table/DataTable.svelte';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import ImageActions from '#lib/components/image/ImageActions.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import ResourceLinksCard, { type ResourceLink } from '#lib/components/ResourceLinksCard.svelte';
import type { SearchTarget } from '#lib/components/search/search.js';
import SearchField from '#lib/components/search/SearchField.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { age, bytes } from '#lib/format.js';
import { resourceKey } from '#lib/stores/actions.svelte.js';
import { containerName, shortId } from '#lib/stores/containers.svelte.js';
import { imageName, imageRepositoryAndTag } from '#lib/stores/images.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { historyColumns, type HistoryLayer } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

// the search of the editor of the Inspect / Kube sections, while one is shown
let search: SearchTarget | undefined = $state.raw();

let image = $derived(app.images.get(view.params.engineId, view.params.imageId));
let users = $derived(app.containers.ofImage(view.params.engineId, view.params.imageId));

// the architecture and the OS are only in the inspect data
const inspect = new AsyncValue<ImageInspectInfo>(() =>
  image ? window.getImageInspect(view.params.engineId, view.params.imageId) : undefined,
);

// loaded each time the History section is shown
const history = new AsyncValue<HistoryInfo[]>(() =>
  view.state.section === 'history' ? window.getImageHistory(view.params.engineId, view.params.imageId) : undefined,
);
// the layers have no unique id (most are `<missing>`): they are keyed by their position
let layers: HistoryLayer[] = $derived((history.value ?? []).map((layer, index) => ({ ...layer, index })));

let details: KeyValue[] = $derived.by(() => {
  if (!image) {
    return [];
  }
  const { repository, tag } = imageRepositoryAndTag(image);
  return [
    { label: 'Name', value: repository },
    { label: 'Tag', value: tag },
    { label: 'ID', value: image.Id.replace('sha256:', ''), mono: true },
    { label: 'Digest', value: image.RepoDigests?.[0]?.split('@')[1] ?? '', mono: true },
    { label: 'Engine', value: app.engines.label(image.engineId, image.engineName) },
    { label: 'Size', value: bytes(image.Size) },
    { label: 'Created', value: `${age(image.Created)} ago` },
    {
      label: 'Platform',
      value: inspect.value ? `${inspect.value.Os}/${inspect.value.Architecture}` : '',
    },
  ];
});

let tags: ResourceLink[] = $derived(
  (image?.RepoTags ?? [])
    .filter(repoTag => repoTag !== '<none>:<none>')
    .map(repoTag => ({ id: repoTag, label: repoTag })),
);

let containers: ResourceLink[] = $derived(
  users.map(container => ({
    id: container.Id,
    label: containerName(container),
    status: container.State,
    ref: viewRef('container-details', { engineId: container.engineId, containerId: container.Id }),
  })),
);

let labels: KeyValue[] = $derived(Object.entries(image?.Labels ?? {}).map(([label, value]) => ({ label, value })));
</script>

<Page
  icon={LayersIcon}
  title={image ? imageName(image) : shortId(view.params.imageId)}
  body={view.state.section === 'inspect' ? 'fill' : 'scroll'}>
  {#snippet meta()}
    {#if image}
      <StatusBadge status={users.length ? 'used' : 'unused'} actionKey={resourceKey('image', image.engineId, image.Id)} />
      <EngineBadge engineId={view.params.engineId} />
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if image}
      {#if search}
        <SearchField target={search} />
      {/if}
      <SegmentedControl
        label="Section"
        bind:value={view.state.section}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'history', label: 'History' },
          { value: 'inspect', label: 'Inspect' },
        ]} />
      <ImageActions {image} used={users.length > 0} placement="header" />
    {/if}
  {/snippet}
  {#if image}
    {#if view.state.section === 'summary'}
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={details} />
        <ResourceLinksCard
          title="Used by ({containers.length})"
          items={containers}
          empty="No container uses this image"
          onOpen={(ref): void => view.open(ref)} />
        <ResourceLinksCard title="Tags ({tags.length})" items={tags} empty="No tags" />
        <KeyValueCard title="Labels ({labels.length})" rows={labels} empty="No labels" />
      </div>
    {:else if view.state.section === 'history'}
      <DataTable data={layers} columns={historyColumns} getRowId={(layer): string => String(layer.index)} />
    {:else}
      <CodeEditor bind:search language="json" value={inspect.value ? JSON.stringify(inspect.value, undefined, 2) : ''} />
    {/if}
  {:else if app.images.loaded}
    <NotFound noun="Image" />
  {/if}
</Page>
