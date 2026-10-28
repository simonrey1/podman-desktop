<script lang="ts">
import SearchIcon from '@lucide/svelte/icons/search';
import XIcon from '@lucide/svelte/icons/x';

import * as InputGroup from '#lib/components/ui/input-group/index.js';

let { value = $bindable(''), placeholder = 'Filter' }: { value?: string; placeholder?: string } = $props();

function onkeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    value = '';
  }
}
</script>

<InputGroup.Root>
  <InputGroup.Addon>
    <SearchIcon />
  </InputGroup.Addon>
  <InputGroup.Input bind:value {placeholder} aria-label={placeholder} {onkeydown} />
  <!-- always there, hidden when empty: the width of the field does not change when typing -->
  <InputGroup.Addon align="inline-end">
    <span class={['flex', !value && 'invisible']}>
      <InputGroup.Button size="icon-xs" aria-label="Clear the filter" onclick={(): string => (value = '')}>
        <XIcon />
      </InputGroup.Button>
    </span>
  </InputGroup.Addon>
</InputGroup.Root>
