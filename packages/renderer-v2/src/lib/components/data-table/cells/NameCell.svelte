<script lang="ts">
import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

import { getApp } from '#lib/app.svelte.js';
import StatusDot from '#lib/components/StatusDot.svelte';
import { Spinner } from '#lib/components/ui/spinner/index.js';

interface Props {
  name: string;
  status: string;
  /** the tooltip of the status, by default the status */
  statusLabel?: string;
  /** muted, after the name (e.g. the published ports of a container) */
  detail?: string;
  /** the key of the resource for its actions: while one runs, its progress replaces the status */
  actionKey?: string;
  /** a group of rows (e.g. a pod): a chevron expands or collapses it */
  expanded?: boolean;
  onToggle?: () => void;
  /** the depth of a row in a group: indented */
  depth?: number;
}

// the first column of every resource table: its status, its name and an optional detail
let { name, status, statusLabel, detail, actionKey, expanded, onToggle, depth = 0 }: Props = $props();

const app = getApp();

let pending = $derived(actionKey ? app.actions.pending(actionKey) : undefined);
</script>

<!-- a row of a group is indented by the chevron of its group and its gap (0.75rem + 0.5rem): its status and its name
     are under the ones of the group -->
<div class="flex min-w-0 items-center gap-2 ps-(--depth-indent)" style:--depth-indent="{depth * 1.25}rem">
  {#if onToggle}
    <!-- in a clickable row: the chevron does not open the row -->
    <button
      class="-ms-1 flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
      aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
      aria-expanded={expanded}
      onclick={(event): void => {
        event.stopPropagation();
        onToggle();
      }}
      ondblclick={(event): void => event.stopPropagation()}>
      <ChevronRightIcon class={['size-3.5 transition-transform', expanded && 'rotate-90']} />
    </button>
  {/if}
  {#if pending}
    <Spinner size="sm" aria-label={pending.progress ?? pending.label} />
  {:else}
    <StatusDot {status} label={statusLabel} />
  {/if}
  <span class="min-w-0 truncate text-accent-foreground">{name}</span>
  {#if pending?.progress}
    <span class="shrink-0 text-muted-foreground">{pending.progress}…</span>
  {:else if detail}
    <!-- no width of its own: the name keeps its width, the detail is truncated first -->
    <span class="min-w-0 flex-1 truncate text-muted-foreground">{detail}</span>
  {/if}
</div>
