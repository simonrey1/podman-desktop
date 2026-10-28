<script lang="ts">
import ServerIcon from '@lucide/svelte/icons/server';

import { getApp } from '#lib/app.svelte.js';
import Page from '#lib/components/Page.svelte';
import StatCard from '#lib/components/StatCard.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { explorerEntries } from '#lib/shell/explorer.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let engine = $derived(app.engines.get(view.params.engineId));
// the resources of the engine, without its overview (this view)
let sections = $derived(explorerEntries(app, view.params.engineId).filter(entry => entry.count !== undefined));
</script>

<Page icon={ServerIcon} title={engine?.name ?? view.params.engineId}>
  {#snippet meta()}
    {#if engine}
      <StatusBadge status={engine.status} />
      <span class="text-muted-foreground">{engine.providerName}</span>
    {/if}
  {/snippet}
  <section class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 p-3">
    {#each sections as section (section.id)}
      <StatCard
        icon={section.icon}
        label={section.label}
        value={section.count ?? 0}
        onclick={(): void => view.open(section.ref)} />
    {/each}
  </section>
</Page>
