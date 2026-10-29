<script lang="ts">
import type { HTMLAttributes } from 'svelte/elements';

import { cn, type WithElementRef } from '#lib/utils.js';

let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="dialog-header"
	class={cn("flex shrink-0 flex-col gap-0.5 border-b px-4 py-3 pe-11", className)}
	{...restProps}
>
	{@render children?.()}
</div>
