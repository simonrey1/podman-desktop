<script lang="ts">
import BoxIcon from '@lucide/svelte/icons/box';

import { getApp } from '#lib/app.svelte.js';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { containerName, shortId } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';

// the 32px header of a container session (logs, terminal): the container, its status and its engine,
// with the same badges as the header of the container page
let { engineId, containerId }: { engineId: string; containerId: string } = $props();

const app = getApp();

let container = $derived(app.containers.get(engineId, containerId));
</script>

<div class="bar h-tabs items-center gap-2 px-3">
  <button
    class="flex min-w-0 items-center gap-2 rounded-sm font-medium outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
    title="Open the container"
    onclick={(): void => app.workbench.open(viewRef('container-details', { engineId, containerId }))}>
    <BoxIcon class="size-4 shrink-0 text-muted-foreground" />
    <span class="truncate">{container ? containerName(container) : shortId(containerId)}</span>
  </button>
  {#if container}
    <StatusBadge status={container.State} />
  {/if}
  <EngineBadge {engineId} />
</div>
