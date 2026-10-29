<script lang="ts">
import type { HTMLAttributes } from 'svelte/elements';

import { cn, type WithElementRef } from '#lib/utils.js';

// the content of a dialog, between its header and its footer
let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div bind:this={ref} data-slot="dialog-body" class={cn('flex flex-col gap-4 px-5 py-4', className)} {...restProps}>
  {@render children?.()}
</div>
