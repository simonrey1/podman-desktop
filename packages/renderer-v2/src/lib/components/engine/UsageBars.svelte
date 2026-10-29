<script lang="ts">
import { bytes } from '#lib/format.js';

import type { ConnectionUsageMetrics } from './connection-usage.svelte.js';

interface Props {
  metrics: ConnectionUsageMetrics;
}

// the CPUs, the memory and the disk of a connection: how much is used, in thin bars
let { metrics }: Props = $props();

let rows = $derived(
  [
    metrics.cpu && { label: 'CPU', total: `${metrics.cpu.total} CPUs`, percent: metrics.cpu.percent },
    metrics.memory && { label: 'Memory', total: bytes(metrics.memory.total), percent: metrics.memory.percent },
    metrics.disk && { label: 'Disk', total: bytes(metrics.disk.total), percent: metrics.disk.percent },
  ].filter(row => !!row),
);
</script>

<div class="flex flex-col gap-0.5 text-xs text-muted-foreground">
  {#each rows as row (row.label)}
    <div class="flex items-center gap-2" title="{Math.round(row.percent)}% of {row.total}">
      <span class="w-12 text-right">{row.label}</span>
      <div
        class="h-1.5 w-14 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-label="{row.label} used"
        aria-valuenow={Math.round(row.percent)}
        aria-valuemin={0}
        aria-valuemax={100}>
        <div class="h-full w-(--used) rounded-full bg-foreground/70" style:--used="{Math.min(100, Math.max(0, row.percent))}%"></div>
      </div>
      <span class="w-8 text-right tabular-nums">{Math.round(row.percent)}%</span>
    </div>
  {/each}
</div>
