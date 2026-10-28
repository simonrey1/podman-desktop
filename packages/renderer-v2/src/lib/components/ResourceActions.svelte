<script lang="ts">
import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';

import ActionButton from '#lib/components/ActionButton.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';

import { type ResourceAction, runAction } from './actions.js';

interface Props {
  /** by priority: the first ones are shown as buttons */
  actions: ResourceAction[];
  /** the number of buttons: above, the last button opens a menu with the other actions */
  max: number;
  size?: 'icon' | 'icon-sm';
}

let { actions, max, size = 'icon-sm' }: Props = $props();

let inline = $derived(actions.length > max ? actions.slice(0, max - 1) : actions);
let overflow = $derived(actions.length > max ? actions.slice(max - 1) : []);

function stop(event: Event): void {
  // the actions are in clickable rows: do not open the row
  event.stopPropagation();
}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="flex items-center gap-0.5" onclick={stop} ondblclick={stop}>
  {#each inline as action (action.label)}
    <ActionButton
      {size}
      icon={action.icon}
      label={action.label}
      filled={action.filled}
      disabled={action.disabled}
      onclick={(): void => runAction(action)} />
  {/each}
  {#if overflow.length}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" {size} aria-label="More actions">
            <EllipsisVerticalIcon class={size === 'icon' ? 'size-4' : 'size-3.5'} />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        {#each overflow as action (action.label)}
          <DropdownMenu.Item
            variant={action.destructive ? 'destructive' : 'default'}
            disabled={action.disabled}
            onSelect={(): void => runAction(action)}>
            <action.icon fill={action.filled ? 'currentColor' : 'none'} />
            {action.label}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
