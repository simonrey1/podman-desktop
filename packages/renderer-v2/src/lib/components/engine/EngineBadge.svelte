<script lang="ts">
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import { Badge } from '#lib/components/ui/badge/index.js';
import { viewRef } from '#lib/views/index.js';

// the engine of a resource: opens the overview of the engine
let { engineId }: { engineId: string } = $props();

const app = getApp();

let engine = $derived(app.engines.get(engineId));
</script>

<button
  class="rounded-4xl outline-none focus-visible:ring-1 focus-visible:ring-ring"
  onclick={(): void => app.workbench.open(viewRef('engine', { engineId }))}>
  <Badge variant="outline">
    <ServerIcon />
    {engine?.name ?? engineId}
  </Badge>
</button>
