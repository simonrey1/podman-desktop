<script lang="ts">
import { Dialog as DialogPrimitive } from 'bits-ui';
import type { HTMLAttributes } from 'svelte/elements';

import { Button } from '#lib/components/ui/button/index.js';
import { cn, type WithElementRef } from '#lib/utils.js';

let {
  ref = $bindable(null),
  class: className,
  children,
  showCloseButton = false,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
  showCloseButton?: boolean;
} = $props();
</script>

<div
	bind:this={ref}
	data-slot="dialog-footer"
	class={cn("flex shrink-0 items-center justify-end gap-2 border-t px-4 py-2.5", className)}
	{...restProps}
>
	{@render children?.()}
	{#if showCloseButton}
		<DialogPrimitive.Close>
			{#snippet child({ props })}
				<Button variant="outline" {...props}>Close</Button>
			{/snippet}
		</DialogPrimitive.Close>
	{/if}
</div>
