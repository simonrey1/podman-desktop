<script lang="ts">
import { LinearProgress } from '@podman-desktop/ui-svelte';

import type { TaskInfoUI } from '/@/stores/tasks';

interface Props {
  task: TaskInfoUI;
}

const { task }: Props = $props();
</script>

<div class="flex items-center gap-x-2">
  <LinearProgress
    value={task.progress}
    class="w-20 h-1 text-(--pd-progressBar-in-progress-bg)"
    style="--pd-linear-progress-track: var(--pd-progressBar-bg)" />
  {#if task.progress !== undefined}
    <span class="text-xs min-w-5">{Math.round(task.progress)}%</span>
  {/if}
</div>
