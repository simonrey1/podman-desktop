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

<div bind:this={ref} data-slot="dialog-body" class={cn('flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-3', className)} {...restProps}>
  {@render children?.()}
</div>
