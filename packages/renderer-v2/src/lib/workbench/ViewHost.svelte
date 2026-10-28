<script lang="ts">
import { getApp } from '#lib/app.svelte.js';
import { viewDefinition } from '#lib/views/index.js';

import type { TabGroup } from './tab-group.svelte.js';
import { ViewHandle } from './view-handle.js';
import { loadViewComponent } from './view-loader.js';

let { group }: { group: TabGroup } = $props();

const app = getApp();

// the active view, and the views kept alive (e.g. terminals): they stay mounted, hidden
let mounted = $derived(group.tabs.filter(tab => tab.key === group.activeKey || viewDefinition(tab.ref.view).keepAlive));
</script>

<div class="relative min-h-0 flex-1">
  {#each mounted as tab (tab.key)}
    <div class={['absolute inset-0', tab.key !== group.activeKey && 'invisible']}>
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
