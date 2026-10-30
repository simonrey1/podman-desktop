<script lang="ts">
import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
import XIcon from '@lucide/svelte/icons/x';

import ActionButton from '#lib/components/ActionButton.svelte';
import { Toggle } from '#lib/components/ui/toggle/index.js';

import type { SearchResults, SearchTarget } from './search.js';

interface Props {
  /** what is searched: a terminal, an editor (undefined while it loads) */
  target: SearchTarget | undefined;
}

// over the top-right corner of a terminal or an editor (its parent is positioned), opened by Ctrl/Cmd+F: the matches
// are highlighted as the query is typed, Enter / Shift+Enter select the next / previous one, Escape closes it
let { target }: Props = $props();

let open = $state(false);
let query = $state('');
let caseSensitive = $state(false);
let regex = $state(false);
let results: SearchResults = $state({ index: -1, count: 0 });
let input: HTMLInputElement | undefined = $state();

$effect(() => target?.onResults(next => (results = next)));

$effect(() =>
  target?.onFindRequest(() => {
    open = true;
    // once shown
    queueMicrotask(() => {
      input?.focus();
      input?.select();
    });
  }),
);

// as the query (or how it matches) changes
$effect(() => {
  if (open && query) {
    target?.find(query, 'incremental', { caseSensitive, regex });
  } else {
    target?.clear();
  }
});

function find(direction: 'next' | 'previous'): void {
  if (query) {
    target?.find(query, direction, { caseSensitive, regex });
  }
}

function close(): void {
  open = false;
}

function onkeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault();
    find(event.shiftKey ? 'previous' : 'next');
  } else if (event.key === 'Escape') {
    event.preventDefault();
    close();
  }
}
</script>

{#if open}
  <div
    class="absolute top-2 right-4 z-10 flex items-center gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
    role="search">
    <div class="flex h-6 w-56 items-center gap-0.5 rounded-sm border bg-background ps-1.5 pe-0.5 focus-within:border-ring">
      <input
        bind:this={input}
        bind:value={query}
        class={['min-w-0 flex-1 bg-transparent text-sm outline-none', query && !results.count && 'text-state-error']}
        placeholder="Find"
        aria-label="Find"
        {onkeydown} />
      <Toggle size="xs" bind:pressed={caseSensitive} aria-label="Match case" title="Match case">Cc</Toggle>
      <Toggle size="xs" bind:pressed={regex} aria-label="Regular expression" title="Regular expression">.*</Toggle>
    </div>
    <span
      class={['w-12 text-center text-xs tabular-nums', query && !results.count ? 'text-state-error' : 'text-muted-foreground']}
      aria-live="polite">
      {results.count ? results.index + 1 : 0}/{results.count}
    </span>
    <ActionButton
      icon={ArrowUpIcon}
      label="Previous match (Shift+Enter)"
      size="icon-xs"
      disabled={!results.count}
      onclick={(): void => find('previous')} />
    <ActionButton
      icon={ArrowDownIcon}
      label="Next match (Enter)"
      size="icon-xs"
      disabled={!results.count}
      onclick={(): void => find('next')} />
    <ActionButton icon={XIcon} label="Close (Escape)" size="icon-xs" onclick={close} />
  </div>
{/if}
