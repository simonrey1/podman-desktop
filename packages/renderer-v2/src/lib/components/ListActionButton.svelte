<script lang="ts">
import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

import { getApp } from '#lib/app.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import type { ResourceAction, ResourceActionSet } from '#lib/stores/actions.svelte.js';

interface Props {
  /** one action (a button), or several (a menu): e.g. the prunes of the unused or the untagged images */
  set: ResourceActionSet;
  /** the label of the menu, when there are several actions */
  label?: string;
}

// in the header of a list: an action on the resources of the engine, e.g. Prune, with a spinner while it runs
let { set, label }: Props = $props();

const app = getApp();

let pending = $derived(app.actions.pending(set.target.key));
let [first] = $derived(set.actions);

function run(action: ResourceAction): void {
  app.actions.run(set.target, action).catch((error: unknown) => console.error(`Error running ${action.label}`, error));
}
</script>

{#snippet icon()}
  {#if pending}
    <Spinner data-icon="inline-start" />
  {:else}
    <first.icon data-icon="inline-start" />
  {/if}
{/snippet}

{#if set.actions.length === 1}
  <Button variant="outline" disabled={!!pending} onclick={(): void => run(first)}>
    {@render icon()}
    {first.label}
  </Button>
{:else}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Button {...props} variant="outline" disabled={!!pending}>
          {@render icon()}
          {label}
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      {#each set.actions as action (action.label)}
        <DropdownMenu.Item variant={action.destructive ? 'destructive' : 'default'} onSelect={(): void => run(action)}>
          <action.icon />
          {action.label}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
