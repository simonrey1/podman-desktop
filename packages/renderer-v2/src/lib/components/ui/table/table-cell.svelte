<script lang="ts">
import type { HTMLTdAttributes } from 'svelte/elements';

import { cn, type WithElementRef } from '#lib/utils.js';

let { ref = $bindable(null), class: className, children, ...restProps }: WithElementRef<HTMLTdAttributes> = $props();
</script>

<td bind:this={ref} data-slot="table-cell" class={cn("h-8.5 px-2 py-0 w-(--column-width) first:pl-3 last:pr-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)} {...restProps}>
	{@render children?.()}
</td>
