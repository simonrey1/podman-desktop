<script lang="ts">
import type { TaskInfo } from '@desktop-framework/api';
import BanIcon from '@lucide/svelte/icons/ban';
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import CircleXIcon from '@lucide/svelte/icons/circle-x';

import { Spinner } from '#lib/components/ui/spinner/index.js';

// the status of a task, then its name and its error
let { task }: { task: TaskInfo } = $props();
</script>

<div class="flex min-w-0 items-center gap-2">
  {#if task.status === 'in-progress'}
    <Spinner size="sm" aria-label="Running" />
  {:else if task.status === 'success'}
    <CircleCheckIcon class="size-3.5 shrink-0 text-state-success" aria-label="Succeeded" />
  {:else if task.status === 'failure'}
    <CircleXIcon class="size-3.5 shrink-0 text-state-error" aria-label="Failed" />
  {:else}
    <BanIcon class="size-3.5 shrink-0 text-muted-foreground" aria-label="Canceled" />
  {/if}
  <span class="min-w-0 truncate text-accent-foreground">{task.name}</span>
  {#if task.error}
    <span class="min-w-0 flex-1 truncate text-state-error" title={task.error}>{task.error}</span>
  {/if}
</div>
