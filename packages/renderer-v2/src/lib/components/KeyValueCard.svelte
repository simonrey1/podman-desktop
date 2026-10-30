<script lang="ts">
import CopyIcon from '@lucide/svelte/icons/copy';
import { toast } from 'svelte-sonner';

import ActionButton from '#lib/components/ActionButton.svelte';
import type { ViewRef } from '#lib/views/index.js';

import Card from './Card.svelte';

export interface KeyValue {
  label: string;
  value: string;
  /** monospace value, e.g. an ID or a command */
  mono?: boolean;
  /** the view of the value, e.g. the image of a container: the value opens it */
  ref?: ViewRef;
  /** an address opened in the browser by the value, e.g. a published port */
  href?: string;
  /** the value can be copied, e.g. the socket of an engine */
  copy?: boolean;
}

// a titled card of key/value rows (label column 160px, muted), e.g. the summary of a resource
interface Props {
  title: string;
  rows: KeyValue[];
  empty?: string;
  /** opens the view of a value having one */
  onOpen?: (ref: ViewRef) => void;
  /** the labels above their values: for a narrow card */
  stacked?: boolean;
}

let { title, rows, empty = 'None', onOpen, stacked = false }: Props = $props();
</script>

<Card {title}>
  {#if rows.length}
    <dl class="flex flex-col gap-2">
      {#each rows as row (`${row.label}:${row.value}`)}
        {@const ref = row.ref}
        <div class={stacked ? 'flex flex-col' : 'flex items-baseline gap-4'}>
          <dt class={['truncate text-muted-foreground', !stacked && 'w-40 shrink-0']} title={row.label}>{row.label}</dt>
          <dd class={['min-w-0 break-all select-text', row.mono && 'font-mono text-sm']}>
            {#if ref && onOpen && row.value}
              <button
                class="rounded-sm text-left outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
                onclick={(): void => onOpen(ref)}>{row.value}</button>
            {:else if row.href}
              {@const href = row.href}
              <button
                class="rounded-sm text-left text-primary outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
                title="Open {href} in the browser"
                onclick={(): void => {
                  window.openExternal(href).catch(console.error);
                }}>{row.value}</button>
            {:else}
              {row.value || '—'}
            {/if}
            {#if row.copy && row.value}
              {@const value = row.value}
              <ActionButton
                icon={CopyIcon}
                label="Copy {row.label.toLowerCase()}"
                size="icon-xs"
                onclick={(): void => {
                  window
                    .clipboardWriteText(value)
                    .then(() => toast.success(`${row.label} copied`))
                    .catch(console.error);
                }} />
            {/if}
          </dd>
        </div>
      {/each}
    </dl>
  {:else}
    <p class="text-muted-foreground">{empty}</p>
  {/if}
</Card>
