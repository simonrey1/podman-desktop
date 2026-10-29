<script lang="ts">
import XIcon from '@lucide/svelte/icons/x';
import { Dialog as DialogPrimitive } from 'bits-ui';
import type { ComponentProps, Snippet } from 'svelte';

import { Button } from '#lib/components/ui/button/index.js';
import { cn, type WithoutChildrenOrChild } from '#lib/utils.js';

import DialogOverlay from './dialog-overlay.svelte';
import DialogPortal from './dialog-portal.svelte';

let {
  ref = $bindable(null),
  class: className,
  portalProps,
  children,
  showCloseButton = true,
  placement = 'center',
  size = 'sm',
  ...restProps
}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
  portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
  children: Snippet;
  showCloseButton?: boolean;
  /**
   * top: under the title bar, without padding, for the pickers (quick pick, input box);
   * wide: centered and wider, without padding (e.g. cards to pick)
   */
  placement?: 'center' | 'top' | 'wide';
  /** the width of a centered dialog: sm for the confirmations and short forms, md for the longer forms */
  size?: 'sm' | 'md';
} = $props();
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 grid max-w-[calc(100%_-_2rem)] rounded-xl text-sm ring-1 duration-100 fixed left-1/2 z-50 w-full -translate-x-1/2 outline-none",
			{
				center: "bg-modal text-modal-foreground border border-modal-border shadow-xl ring-0 top-1/2 -translate-y-1/2 flex max-h-[85vh] flex-col gap-0 p-0",
				top: "top-16 gap-0 overflow-hidden p-0 shadow-xl sm:max-w-xl",
				wide: "top-1/2 -translate-y-1/2 gap-0 overflow-hidden p-0 shadow-xl sm:max-w-3xl",
			}[placement],
			placement === "center" && (size === "md" ? "sm:max-w-[34rem]" : "sm:max-w-[26rem]"),
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close data-slot="dialog-close">
				{#snippet child({ props })}
					<Button variant="ghost" class="absolute top-2.5 right-3" size="icon-sm" {...props}>
						<XIcon  />
						<span class="sr-only">Close</span>
					</Button>
				{/snippet}
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
