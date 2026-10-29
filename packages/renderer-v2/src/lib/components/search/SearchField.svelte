<script lang="ts">
import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
import SearchIcon from '@lucide/svelte/icons/search';
import XIcon from '@lucide/svelte/icons/x';

import * as InputGroup from '#lib/components/ui/input-group/index.js';

import type { SearchResults, SearchTarget } from './search.js';

interface Props {
  /** what is searched: a terminal, an editor (undefined while it loads) */
  target: SearchTarget | undefined;
  placeholder?: string;
}

// the search of a terminal or an editor: the matches are highlighted as the query is typed,
// Enter / Shift+Enter (or the arrows) select the next / previous one, Escape clears it
let { target, placeholder = 'Search' }: Props = $props();

let query = $state('');
let results: SearchResults = $state({ index: -1, count: 0 });
let input: HTMLInputElement | null = $state(null);

$effect(() => target?.onResults(next => (results = next)));

// Ctrl+F in the target focuses the field
$effect(() =>
  target?.onFindRequest(() => {
    input?.focus();
    input?.select();
  }),
);

// as the query is typed
$effect(() => {
  if (query) {
    target?.find(query, 'incremental');
  } else {
    target?.clear();
  }
});

function find(direction: 'next' | 'previous'): void {
  if (query) {
    target?.find(query, direction);
  }
}

function onkeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    event.preventDefault();
    find(event.shiftKey ? 'previous' : 'next');
  } else if (event.key === 'Escape') {
    query = '';
  }
}
</script>

<div class="w-64">
  <InputGroup.Root>
    <InputGroup.Addon>
      <SearchIcon />
    </InputGroup.Addon>
    <InputGroup.Input bind:ref={input} bind:value={query} {placeholder} aria-label={placeholder} {onkeydown} />
    <!-- always there, hidden when empty: the width of the field does not change when typing -->
    <InputGroup.Addon align="inline-end">
      <span class={['flex items-center gap-0.5', !query && 'invisible']}>
        <span class="px-1 text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {results.count ? `${results.index + 1} of ${results.count}` : 'No results'}
        </span>
        <InputGroup.Button size="icon-xs" aria-label="Previous match" disabled={!results.count} onclick={(): void => find('previous')}>
          <ChevronUpIcon />
        </InputGroup.Button>
        <InputGroup.Button size="icon-xs" aria-label="Next match" disabled={!results.count} onclick={(): void => find('next')}>
          <ChevronDownIcon />
        </InputGroup.Button>
        <InputGroup.Button size="icon-xs" aria-label="Clear the search" onclick={(): string => (query = '')}>
          <XIcon />
        </InputGroup.Button>
      </span>
    </InputGroup.Addon>
  </InputGroup.Root>
</div>
