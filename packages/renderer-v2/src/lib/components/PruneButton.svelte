<script lang="ts">
import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';

import { getApp } from '#lib/app.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import type { ResourceAction, ResourceActionSet } from '#lib/stores/actions.svelte.js';

interface Props {
  /** one prune (a button), or several (a menu): e.g. the unused or the untagged images */
  prune: ResourceActionSet;
}

// in the header of a list: removes the unused resources of the engine, after a confirmation
let { prune }: Props = $props();

const app = getApp();

let pending = $derived(app.actions.pending(prune.target.key));
let [first] = $derived(prune.actions);

function run(action: ResourceAction): void {
  app.actions.run(prune.target, action).catch((error: unknown) => console.error('Error running a prune', error));
}
</script>

{#snippet icon()}
  {#if pending}
    <Spinner data-icon="inline-start" />
  {:else}
    <first.icon data-icon="inline-start" />
  {/if}
{/snippet}

{#if prune.actions.length === 1}
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
          Prune
          <ChevronDownIcon data-icon="inline-end" />
        </Button>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
      {#each prune.actions as action (action.label)}
        <DropdownMenu.Item variant="destructive" onSelect={(): void => run(action)}>
          <action.icon />
          {action.label}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/if}
