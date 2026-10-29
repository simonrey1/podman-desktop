<script lang="ts">
import type { PodInfo } from '@desktop-framework/api';
import BoxesIcon from '@lucide/svelte/icons/boxes';
import FileCodeIcon from '@lucide/svelte/icons/file-code';
import PlayIcon from '@lucide/svelte/icons/play';

import { getApp } from '#lib/app.svelte.js';
import { FIRST_POD, HELLO_IMAGE, runFirst } from '#lib/components/container/first-run.svelte.js';
import { podActions, podPrune } from '#lib/components/pod/actions.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import StateFilter from '#lib/components/StateFilter.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import { isShown } from '#lib/views/shared.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { podColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

// the first one is being started, from the empty list
let starting = $state(false);

let pods = $derived(
  app.pods
    .ofEngine(view.params.engineId)
    .filter(pod => isShown(view.state.show, pod.Status.toLowerCase() === 'running')),
);

// kube play is a feature of Podman
let podman = $derived(app.engines.get(view.params.engineId)?.connection.type === 'podman');

function open(row: PodInfo, options: { preview: boolean }): void {
  view.open(viewRef('pod-details', { engineId: row.engineId, podId: row.Id }), options);
}
</script>

<ResourceList
  engineId={view.params.engineId}
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  filtered={view.state.show !== 'all'}
  onResetFilters={(): unknown => (view.state.show = 'all')}
  actionsOf={(pod): ResourceActionSet => podActions(pod, app)}
  prune={podPrune(view.params.engineId, app.engines.label(view.params.engineId, view.params.engineId))}
  bulk={['Start', 'Stop', 'Delete']}
  icon={BoxesIcon}
  title="Pods"
  noun="pods"
  data={pods}
  columns={podColumns}
  getRowId={(pod): string => pod.Id}
  onOpen={open}
  loaded={app.pods.loaded}>
  {#snippet filters()}
    <StateFilter bind:value={view.state.show} />
    {#if podman}
      <Button variant="outline" onclick={(): void => view.open(viewRef('kube-play', { engineId: view.params.engineId }))}>
        <FileCodeIcon data-icon="inline-start" />
        Play Kubernetes YAML
      </Button>
    {/if}
  {/snippet}
  {#snippet emptyContent()}
    <p class="text-muted-foreground">Start a first pod, {FIRST_POD}, with a container of {HELLO_IMAGE}.</p>
    <Button
      disabled={starting}
      onclick={(): void => {
        starting = true;
        runFirst(app, view.params.engineId, true)
          .catch(console.error)
          .finally(() => (starting = false));
      }}>
      {#if starting}
        <Spinner data-icon="inline-start" />
      {:else}
        <PlayIcon data-icon="inline-start" />
      {/if}
      Start a first pod
    </Button>
  {/snippet}
</ResourceList>
