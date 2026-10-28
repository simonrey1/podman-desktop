<script lang="ts" module>
import type { LucideIcon } from '@lucide/svelte';

/** An action on the selected resources, e.g. Delete. */
export interface BulkAction {
  label: string;
  icon: LucideIcon;
  filled?: boolean;
  /** confirmed before running (the confirmation is asked by the actions store) */
  destructive?: boolean;
  /** the number of selected resources it applies to (e.g. Stop: the running ones) */
  count: number;
  run: () => void;
}
</script>

<script lang="ts">
import XIcon from '@lucide/svelte/icons/x';

import { Button } from '#lib/components/ui/button/index.js';

interface Props {
  /** the number of selected resources */
  selected: number;
  actions: BulkAction[];
  onClear: () => void;
}

// under the header of a list while rows are selected: their number, the actions on them, and Clear
let { selected, actions, onClear }: Props = $props();
</script>

<div class="flex h-9 shrink-0 items-center gap-1 border-b bg-primary/10 px-3" role="toolbar" aria-label="Selection">
  <span class="pr-2 font-medium">{selected} selected</span>
  {#each actions as action (action.label)}
    <Button
      variant="ghost"
      size="sm"
      disabled={action.count === 0}
      onclick={action.run}>
      <action.icon fill={action.filled ? 'currentColor' : 'none'} />
      {action.label}
      {#if action.count > 0 && action.count < selected}
        <span class="text-muted-foreground">({action.count})</span>
      {/if}
    </Button>
  {/each}
  <div class="ms-auto">
    <Button variant="ghost" size="sm" onclick={onClear}>
      <XIcon />
      Clear
    </Button>
  </div>
</div>
