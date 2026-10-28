<script lang="ts">
import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';

import { cn } from '#lib/utils.js';

let { ref = $bindable(null), class: className, ...restProps }: AlertDialogPrimitive.DescriptionProps = $props();
</script>

<AlertDialogPrimitive.Description
	bind:ref
	data-slot="alert-dialog-description"
	class={cn("px-5 py-4 text-base text-modal-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", className)}
	{...restProps}
/>
