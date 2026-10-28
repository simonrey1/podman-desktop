<script lang="ts">
import * as ResizablePrimitive from 'paneforge';

import { cn, type WithoutChildrenOrChild } from '#lib/utils.js';

let {
  ref = $bindable(null),
  class: className,
  withHandle = false,
  ...restProps
}: WithoutChildrenOrChild<ResizablePrimitive.PaneResizerProps> & {
  withHandle?: boolean;
} = $props();
</script>

<ResizablePrimitive.PaneResizer
	bind:ref
	data-slot="resizable-handle"
	class={cn(
		"relative flex w-px shrink-0 items-center justify-center bg-border outline-hidden transition-colors after:absolute after:inset-y-0 after:left-1/2 after:z-10 after:w-1.5 after:-translate-x-1/2 hover:bg-primary data-active:bg-primary focus-visible:bg-primary data-[direction=vertical]:h-px data-[direction=vertical]:w-full data-[direction=vertical]:after:inset-x-0 data-[direction=vertical]:after:top-1/2 data-[direction=vertical]:after:left-0 data-[direction=vertical]:after:h-1.5 data-[direction=vertical]:after:w-full data-[direction=vertical]:after:translate-x-0 data-[direction=vertical]:after:-translate-y-1/2",
		className
	)}
	{...restProps}
>
	{#if withHandle}
		<div class="bg-border h-6 w-1 rounded-lg z-10 flex shrink-0"></div>
	{/if}
</ResizablePrimitive.PaneResizer>
