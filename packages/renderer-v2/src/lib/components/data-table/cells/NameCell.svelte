<script lang="ts">
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
}

// the first column of every resource table: its status, its name and an optional detail
let { name, status, statusLabel, detail, actionKey }: Props = $props();

const app = getApp();

let pending = $derived(actionKey ? app.actions.pending(actionKey) : undefined);
</script>

<div class="flex min-w-0 items-center gap-2">
  {#if pending}
    <Spinner size="sm" aria-label={pending.progress ?? pending.label} />
  {:else}
    <StatusDot {status} label={statusLabel} />
  {/if}
  <span class="truncate text-accent-foreground">{name}</span>
  {#if pending?.progress}
    <span class="shrink-0 text-muted-foreground">{pending.progress}…</span>
  {:else if detail}
    <span class="shrink-0 text-muted-foreground">{detail}</span>
  {/if}
</div>
