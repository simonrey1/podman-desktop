<script lang="ts">
import type { TaskInfo } from '@desktop-framework/api';

// the progress of a running task (a bar when it tells it), or how it ended
let { task }: { task: TaskInfo } = $props();

const ENDED: Record<string, string> = { success: 'Succeeded', failure: 'Failed', canceled: 'Canceled' };
</script>

{#if task.state === 'running' && task.progress !== undefined}
  <div class="flex items-center gap-2">
    <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={task.progress} aria-valuemin={0} aria-valuemax={100}>
      <div class="h-full w-(--progress) bg-primary" style:--progress="{task.progress}%"></div>
    </div>
    <span class="w-9 text-right tabular-nums">{Math.round(task.progress)}%</span>
  </div>
{:else if task.state === 'running'}
  Running
{:else}
  {ENDED[task.status] ?? task.status}
{/if}
