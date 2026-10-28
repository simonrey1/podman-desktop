<script lang="ts">
import type { ViewRef } from '#lib/views/index.js';

import Card from './Card.svelte';

export interface KeyValue {
  label: string;
  value: string;
  /** monospace value, e.g. an ID or a command */
  mono?: boolean;
  /** the view of the value, e.g. the image of a container: the value opens it */
  ref?: ViewRef;
}

// a titled card of key/value rows (label column 160px, muted), e.g. the summary of a resource
interface Props {
  title: string;
  rows: KeyValue[];
  empty?: string;
  /** opens the view of a value having one */
  onOpen?: (ref: ViewRef) => void;
}

let { title, rows, empty = 'None', onOpen }: Props = $props();
</script>

<Card {title}>
  {#if rows.length}
    <dl class="flex flex-col gap-2">
      {#each rows as row (row.label)}
        {@const ref = row.ref}
        <div class="flex items-baseline gap-4">
          <dt class="w-40 shrink-0 truncate text-muted-foreground" title={row.label}>{row.label}</dt>
          <dd class={['min-w-0 break-all select-text', row.mono && 'font-mono text-sm']}>
            {#if ref && onOpen && row.value}
              <button
                class="rounded-sm text-left outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
                onclick={(): void => onOpen(ref)}>{row.value}</button>
            {:else}
              {row.value || '—'}
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
  {:else}
    <p class="text-muted-foreground">{empty}</p>
  {/if}
</Card>
