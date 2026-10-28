<script lang="ts">
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import InfoIcon from '@lucide/svelte/icons/info';
import Loader2Icon from '@lucide/svelte/icons/loader-2';
import OctagonXIcon from '@lucide/svelte/icons/octagon-x';
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';

// the theme is given by the application (the Podman Desktop themes), not by mode-watcher
let { ...restProps }: SonnerProps = $props();
</script>

<!-- unstyled: the toasts follow the density of the application (compact card, close button, muted message);
     dismissed with the close button, not by swiping -->
<Sonner
	class="toaster group"
	closeButton
	swipeDirections={[]}
	offset={{ bottom: "2rem", right: "0.75rem" }}
	toastOptions={{
		unstyled: true,
		classes: {
			toast: "group/toast relative flex w-[22rem] items-start gap-2.5 rounded-lg border bg-popover p-3 pr-9 text-sm text-popover-foreground shadow-lg",
			icon: "mt-px flex shrink-0 [&>svg]:size-4",
			content: "flex min-w-0 flex-col gap-0.5",
			title: "font-medium",
			description: "text-xs text-muted-foreground break-words select-text",
			closeButton: "absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-3.5",
			error: "[&_[data-icon]]:text-state-error",
			success: "[&_[data-icon]]:text-state-success",
			warning: "[&_[data-icon]]:text-state-warning",
		},
	}}
	{...restProps}
>
	{#snippet loadingIcon()}
		<Loader2Icon class="size-4 animate-spin" />
	{/snippet}
	{#snippet successIcon()}
		<CircleCheckIcon class="size-4" />
	{/snippet}
	{#snippet errorIcon()}
		<OctagonXIcon class="size-4" />
	{/snippet}
	{#snippet infoIcon()}
		<InfoIcon class="size-4" />
	{/snippet}
	{#snippet warningIcon()}
		<TriangleAlertIcon class="size-4" />
	{/snippet}
</Sonner>
