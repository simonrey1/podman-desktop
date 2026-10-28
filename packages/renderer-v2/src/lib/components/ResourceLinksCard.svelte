<script lang="ts" module>
import type { ViewRef } from '#lib/views/index.js';

/** A resource related to the one shown, e.g. a container using an image. */
export interface ResourceLink {
  id: string;
  label: string;
  status?: string;
  /** muted, at the right, e.g. the IP address of a container in a network */
  detail?: string;
  /** the view of the resource: the row opens it */
  ref?: ViewRef;
}
</script>

<script lang="ts">
import Card from './Card.svelte';
import StatusDot from './StatusDot.svelte';

interface Props {
  title: string;
  items: ResourceLink[];
  empty?: string;
  /** opens the view of an item having one */
  onOpen?: (ref: ViewRef) => void;
}

// a titled card listing the resources related to the one shown, each opening its view
let { title, items, empty = 'None', onOpen }: Props = $props();
</script>

<Card {title}>
  {#if items.length}
    <ul class="flex flex-col gap-2">
      {#each items as item (item.id)}
        {@const ref = item.ref}
        <li class="flex min-w-0 items-center gap-2">
          {#if item.status}
            <StatusDot status={item.status} />
          {/if}
          {#if ref && onOpen}
            <button
              class="truncate rounded-sm outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
              onclick={(): void => onOpen(ref)}>{item.label}</button>
          {:else}
            <span class="truncate">{item.label}</span>
          {/if}
          {#if item.detail}
            <span class="ms-auto shrink-0 font-mono text-sm text-muted-foreground">{item.detail}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-muted-foreground">{empty}</p>
  {/if}
</Card>
