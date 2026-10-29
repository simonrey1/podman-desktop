<script lang="ts">
import type { HTMLAttributes } from 'svelte/elements';

import { cn, type WithElementRef } from '#lib/utils.js';

let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn("group/row data-interactive:cursor-pointer hover:bg-muted data-[state=selected]:bg-muted border-b border-border/60 transition-colors outline-none focus-visible:bg-muted", className)}
	{...restProps}
>
	{@render children?.()}
</tr>
