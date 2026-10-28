<script lang="ts">
import type { PodInfo } from '@desktop-framework/api';

import StatusDot from '#lib/components/StatusDot.svelte';

interface Props {
  pod: PodInfo;
}

// the status of each container of the pod, its name in the tooltip
let { pod }: Props = $props();
</script>

<div class="flex items-center justify-end gap-1">
  {#each pod.Containers as container (container.Id)}
    <StatusDot status={container.Status} label="{container.Names}: {container.Status}" />
  {/each}
</div>
