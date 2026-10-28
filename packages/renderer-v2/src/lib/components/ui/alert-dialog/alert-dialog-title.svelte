<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

import { cn } from '#lib/utils.js';

let { ref = $bindable(null), class: className, ...restProps }: AlertDialogPrimitive.TitleProps = $props();
</script>

<AlertDialogPrimitive.Title
	bind:ref
	data-slot="alert-dialog-title"
	class={cn("min-w-0 flex-1 truncate text-xl font-semibold text-modal-header-foreground", className)}
	{...restProps}
/>
