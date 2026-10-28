<script lang="ts">
import type { LucideIcon } from '@lucide/svelte';

import { Button } from '#lib/components/ui/button/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import * as Tooltip from '#lib/components/ui/tooltip/index.js';

interface Props {
  icon: LucideIcon;
  /** the tooltip, and the accessible name of the button */
  label: string;
  /** icon: 28px with a 16px icon (headers), icon-sm: 24px (rows, toolbars), icon-xs: 20px (strips) */
  size?: 'icon' | 'icon-sm' | 'icon-xs';
  /** fills the icon, e.g. the square of Stop */
  filled?: boolean;
  disabled?: boolean;
  /** the action is running: a spinner replaces the icon */
  busy?: boolean;
  onclick: (event: MouseEvent) => void;
}

// a quick action on a resource: an icon-only ghost button with a tooltip
let { icon: Icon, label, size = 'icon-sm', filled = false, disabled = false, busy = false, onclick }: Props = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Button {...props} variant="ghost" {size} {disabled} aria-label={label} {onclick}>
        {#if busy}
          <Spinner size={size === 'icon' ? 'lg' : 'md'} />
        {:else}
          <Icon class={size === 'icon' ? 'size-4' : 'size-3.5'} fill={filled ? 'currentColor' : 'none'} />
        {/if}
      </Button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content>{label}</Tooltip.Content>
</Tooltip.Root>
