<script lang="ts">
import { getApp } from '#lib/app.svelte.js';
import { viewDefinition } from '#lib/views/index.js';

import type { TabGroup } from './tab-group.svelte.js';
import { ViewHandle } from './view-handle.js';
import { loadViewComponent } from './view-loader.js';

let { group }: { group: TabGroup } = $props();

const app = getApp();

// a preview tab whose view is used (its state changes: a filter, a selection, a section...) is kept: it is not
// replaced by the next preview anymore. Not reactive: the state of each preview tab when it was opened.
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping of the effect, must not trigger it
const previewStates = new Map<string, string>();
$effect(() => {
  for (const tab of group.tabs) {
    if (!tab.preview) {
      previewStates.delete(tab.key);
      continue;
    }
    // reads the whole state: the effect runs again on any change of it
    const state = JSON.stringify(tab.state);
    const initial = previewStates.get(tab.key);
    if (initial === undefined) {
      previewStates.set(tab.key, state);
    } else if (initial !== state) {
      previewStates.delete(tab.key);
      group.pin(tab.key);
    }
  }
});

// the active view, and the views kept alive (e.g. terminals): they stay mounted, hidden
let mounted = $derived(group.tabs.filter(tab => tab.key === group.activeKey || viewDefinition(tab.ref.view).keepAlive));
</script>

<div class="relative min-h-0 flex-1">
  {#each mounted as tab (tab.key)}
    <div class={['absolute inset-0', tab.key !== group.activeKey && 'invisible content-hidden']}>
      {#await loadViewComponent(tab.ref.view) then View}
        <View
          view={new ViewHandle(tab.ref.params, tab.state, (ref, options) =>
            app.workbench.open(ref, { ...options, from: 'view' }),
          )} />
      {:catch error}
        <p class="p-3 text-destructive">Error loading the view: {String(error)}</p>
      {/await}
    </div>
  {/each}
</div>
