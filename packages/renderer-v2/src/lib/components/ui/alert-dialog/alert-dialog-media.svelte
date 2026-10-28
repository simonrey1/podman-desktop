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
	data-slot="alert-dialog-media"
	class={cn("inline-flex size-4 shrink-0 items-center justify-center *:[svg:not([class*='size-'])]:size-4", className)}
	{...restProps}
>
	{@render children?.()}
</div>
