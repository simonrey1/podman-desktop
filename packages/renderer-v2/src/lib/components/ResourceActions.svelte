<script lang="ts">
import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import { tooltip } from '#lib/components/tooltip/tooltip.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
import type { ActionTarget, ResourceAction } from '#lib/stores/actions.svelte.js';

interface Props {
  /** the resource the actions apply to */
  target: ActionTarget;
  /** by priority: the first ones are shown as buttons */
  actions: ResourceAction[];
  /** the number of buttons: above, the last button opens a menu with the other actions */
  max: number;
  size?: 'icon' | 'icon-sm';
}

let { target, actions, max, size = 'icon-sm' }: Props = $props();

const app = getApp();

function run(action: ResourceAction): void {
  app.actions.run(target, action).catch((error: unknown) => console.error('Error running an action', error));
}

// while an action runs on the resource, its actions are disabled (the running one shows a spinner)
let pending = $derived(app.actions.pending(target.key));

let shown = $derived(actions.filter(action => !action.hidden));
let inline = $derived(shown.length > max ? shown.slice(0, max - 1) : shown);
let overflow = $derived(shown.length > max ? shown.slice(max - 1) : []);

// the menu is created when first opened, not with each row of a list
let menuCreated = $state(false);
let menuOpen = $state(false);

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
      disabled={!!pending || action.disabled}
      busy={pending?.label === action.label}
      onclick={(): void => run(action)} />
  {/each}
  {#if overflow.length && !menuCreated}
    <Button
      variant="ghost"
      {size}
      aria-label="More actions"
      aria-haspopup="menu"
      disabled={!!pending}
      {@attach tooltip('More actions')}
      onclick={(): void => {
        menuCreated = true;
        menuOpen = true;
      }}>
      <EllipsisVerticalIcon class={size === 'icon' ? 'size-4' : 'size-3.5'} />
    </Button>
  {:else if overflow.length}
    <DropdownMenu.Root bind:open={menuOpen}>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="ghost" {size} aria-label="More actions" disabled={!!pending} {@attach tooltip('More actions')}>
            <EllipsisVerticalIcon class={size === 'icon' ? 'size-4' : 'size-3.5'} />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        {#each overflow as action (action.label)}
          <DropdownMenu.Item
            variant={action.destructive ? 'destructive' : 'default'}
            disabled={action.disabled}
            onSelect={(): void => run(action)}>
            <action.icon fill={action.filled ? 'currentColor' : 'none'} />
            {action.label}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
