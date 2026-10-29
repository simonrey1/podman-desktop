<script lang="ts">
import type { LucideIcon } from '@lucide/svelte';
import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
import type { Snippet } from 'svelte';

import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';

interface Props {
  icon: LucideIcon;
  title: string;
  /** the resource the page is about, before the title: e.g. the image of its files, which it opens */
  parent?: { label: string; icon: LucideIcon; onOpen: () => void };
  /** next to the title, e.g. a status badge */
  meta?: Snippet;
  /** at the right of the header: filters, then the actions (the primary one last) */
  actions?: Snippet;
  /** under the header, outside of the scrolling body: e.g. the bar of the selected rows */
  toolbar?: Snippet;
  /**
   * scroll: the content scrolls under the header (lists, cards); fill: the content fills the body and handles its
   * own scrolling (an editor, a terminal)
   */
  body?: 'scroll' | 'fill';
  children: Snippet;
}

// every page: a 48px header, then its body
let { icon: Icon, title, parent, meta, actions, toolbar, body = 'scroll', children }: Props = $props();
</script>

<div class="flex h-full min-h-0 flex-col">
  <header class="bar h-header items-center gap-2 px-3">
    {#if parent}
      {@const ParentIcon = parent.icon}
      <button
        type="button"
        class="flex min-w-0 shrink items-center gap-2 rounded-md text-xl font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
        title="Open {parent.label}"
        onclick={parent.onOpen}>
        <ParentIcon class="size-4 shrink-0" />
        <span class="truncate">{parent.label}</span>
      </button>
      <ChevronRightIcon class="size-4 shrink-0 text-muted-foreground" />
    {:else}
      <Icon class="size-4 shrink-0 text-muted-foreground" />
    {/if}
    <h1 class="shrink-0 truncate text-xl font-semibold">{title}</h1>
    {@render meta?.()}
    <div class="ms-auto flex items-center gap-2">
      {@render actions?.()}
    </div>
  </header>
  {@render toolbar?.()}
  <div class="min-h-0 flex-1">
    {#if body === 'scroll'}
      <!-- both: a table keeps a minimum width, narrower it scrolls horizontally -->
      <ScrollArea orientation="both">
        {@render children()}
      </ScrollArea>
    {:else}
      {@render children()}
    {/if}
  </div>
</div>
