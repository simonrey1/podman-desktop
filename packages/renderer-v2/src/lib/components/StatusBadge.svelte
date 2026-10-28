<script lang="ts">
import { getApp } from '#lib/app.svelte.js';
import StatusDot from '#lib/components/StatusDot.svelte';
import { Badge } from '#lib/components/ui/badge/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';

interface Props {
  status: string;
  /** the key of the resource for its actions: while one runs, its progress replaces the status */
  actionKey?: string;
}

// the status of a resource, next to its name (page headers, session headers)
let { status, actionKey }: Props = $props();

const app = getApp();

let pending = $derived(actionKey ? app.actions.pending(actionKey) : undefined);
</script>

<Badge variant="outline">
  {#if pending}
    <Spinner size="sm" />
    {pending.progress ?? pending.label}…
  {:else}
    <StatusDot decorative {status} />
    {status}
  {/if}
</Badge>
