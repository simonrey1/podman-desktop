<script lang="ts">
import Card from '#lib/components/Card.svelte';
import { bytes } from '#lib/format.js';

import type { ConnectionUsageMetrics } from './connection-usage.svelte.js';

interface Props {
  metrics: ConnectionUsageMetrics;
}

// the CPUs, the memory and the disk of a connection, with their totals
let { metrics }: Props = $props();

let rows = $derived(
  [
    metrics.cpu && { label: 'CPU', total: `${metrics.cpu.total} CPUs`, percent: metrics.cpu.percent },
    metrics.memory && { label: 'Memory', total: bytes(metrics.memory.total), percent: metrics.memory.percent },
    metrics.disk && { label: 'Disk', total: bytes(metrics.disk.total), percent: metrics.disk.percent },
  ].filter(row => !!row),
);
</script>

<Card title="Usage">
  <div class="flex flex-col gap-3">
    {#each rows as row (row.label)}
      <div class="flex flex-col gap-1">
        <div class="flex items-baseline justify-between">
          <span>{row.label}</span>
          <span class="text-muted-foreground tabular-nums">{Math.round(row.percent)}% of {row.total}</span>
        </div>
        <div
          class="h-2 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label="{row.label} used"
          aria-valuenow={Math.round(row.percent)}
          aria-valuemin={0}
          aria-valuemax={100}>
          <div class="h-full w-(--used) rounded-full bg-primary" style:--used="{Math.min(100, Math.max(0, row.percent))}%"></div>
        </div>
      </div>
    {/each}
  </div>
</Card>
