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
	data-slot="alert-dialog-header"
	class={cn("flex h-11 shrink-0 items-center gap-2 border-b px-4 text-left", className)}
	{...restProps}
>
	{@render children?.()}
</div>
