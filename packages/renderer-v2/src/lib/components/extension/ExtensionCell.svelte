<script lang="ts">
import PuzzleIcon from '@lucide/svelte/icons/puzzle';

import { getApp } from '#lib/app.svelte.js';
import ImageIcon from '#lib/components/ImageIcon.svelte';
import StatusDot from '#lib/components/StatusDot.svelte';
import { Badge } from '#lib/components/ui/badge/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';

interface Props {
  name: string;
  icon?: string | { light: string; dark: string };
  /** an extension installed: its state */
  status?: string;
  /** e.g. Bundled, Featured */
  badges?: string[];
  /** muted, after the name: e.g. its description */
  detail?: string;
  /** the key of the extension for its actions: while one runs, its progress replaces the status */
  actionKey: string;
}

// the first column of the extensions: its status, its icon, its name, its badges and its description
let { name, icon, status, badges = [], detail, actionKey }: Props = $props();

const app = getApp();

let pending = $derived(app.actions.pending(actionKey));
</script>

<div class="flex min-w-0 items-center gap-2">
  {#if pending}
    <Spinner size="sm" aria-label={pending.progress ?? pending.label} />
  {:else if status}
    <StatusDot {status} />
  {/if}
  {#if icon}
    <ImageIcon {icon} class="size-4" />
  {:else}
    <PuzzleIcon class="size-4 shrink-0 text-muted-foreground" />
  {/if}
  <span class="min-w-0 shrink-0 truncate text-accent-foreground">{name}</span>
  {#each badges as badge (badge)}
    <span class="shrink-0"><Badge variant="outline">{badge}</Badge></span>
  {/each}
  {#if pending?.progress}
    <span class="shrink-0 text-muted-foreground">{pending.progress}…</span>
  {:else if detail}
    <span class="min-w-0 flex-1 truncate text-muted-foreground">{detail}</span>
  {/if}
</div>
