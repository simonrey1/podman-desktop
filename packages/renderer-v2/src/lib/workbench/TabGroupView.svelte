<script lang="ts">
import type { Snippet } from 'svelte';

import type { TabGroup } from './tab-group.svelte.js';
import TabStrip from './TabStrip.svelte';
import ViewHost from './ViewHost.svelte';

interface Props {
  group: TabGroup;
  /** the accessible name of the tabs, also shown before them when `title` is set */
  label: string;
  /** shows the label as the title of the group, e.g. for a tool window */
  title?: boolean;
  /** at the right of the tabs */
  actions?: Snippet;
  /** shown when the group has no tab */
  empty?: Snippet;
}

// a tab group: its tabs in a 32px strip, then the active view
let { group, label, title = false, actions, empty }: Props = $props();
</script>

<div class="bar h-tabs items-stretch">
  {#if title}
    <span class="flex items-center pr-2 pl-3 font-semibold">{label}</span>
  {/if}
  <TabStrip {group} {label} />
  {#if actions}
    <div class="flex items-center px-1">
      {@render actions()}
    </div>
  {/if}
</div>
{#if group.tabs.length === 0 && empty}
  {@render empty()}
{:else}
  <ViewHost {group} />
{/if}
