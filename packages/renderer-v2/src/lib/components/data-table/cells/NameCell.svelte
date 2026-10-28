<script lang="ts">
import StatusDot from '#lib/components/StatusDot.svelte';

interface Props {
  name: string;
  status: string;
  /** the tooltip of the status, by default the status */
  statusLabel?: string;
  /** muted, after the name (e.g. the published ports of a container) */
  detail?: string;
}

// the first column of every resource table: its status, its name and an optional detail
let { name, status, statusLabel, detail }: Props = $props();
</script>

<div class="flex min-w-0 items-center gap-2">
  <StatusDot {status} label={statusLabel} />
  <span class="truncate text-accent-foreground">{name}</span>
  {#if detail}
    <span class="shrink-0 text-muted-foreground">{detail}</span>
  {/if}
</div>
