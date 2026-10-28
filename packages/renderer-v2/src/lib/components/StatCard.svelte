<script lang="ts">
import type { LucideIcon } from '@lucide/svelte';

interface Props {
  icon: LucideIcon;
  label: string;
  value: number | string;
  detail?: string;
  onclick?: () => void;
}

let { icon: Icon, label, value, detail, onclick }: Props = $props();
</script>

<button
  class="flex flex-col gap-2 rounded-lg bg-card p-4 text-left text-card-foreground outline-none hover:ring-1 hover:ring-border focus-visible:ring-2 focus-visible:ring-ring"
  {onclick}>
  <span class="flex items-center gap-2 text-muted-foreground">
    <Icon class="size-4" />
    {label}
  </span>
  <span class="text-2xl font-semibold tabular-nums">{value}</span>
  {#if detail}
    <span class="text-xs text-muted-foreground">{detail}</span>
  {/if}
</button>
