<script lang="ts">
import Card from '#lib/components/Card.svelte';
import type { Setting } from '#lib/stores/configuration.svelte.js';

import SettingItem from './SettingItem.svelte';

interface Props {
  settings: Setting[];
  /** shown when there are no settings */
  empty?: string;
  fullLabel?: boolean;
}

// settings grouped by their configuration node (e.g. Terminal), a card each
let { settings, empty = 'No settings', fullLabel = false }: Props = $props();

let groups = $derived.by(() => {
  const byNode: Record<string, { title: string; settings: Setting[] }> = {};
  for (const setting of settings) {
    byNode[setting.parentId] ??= { title: setting.title, settings: [] };
    byNode[setting.parentId]?.settings.push(setting);
  }
  return Object.entries(byNode).toSorted(([, a], [, b]) => a.title.localeCompare(b.title));
});
</script>

{#each groups as [id, group] (id)}
  <Card title={group.title}>
    <div class="flex flex-col divide-y">
      {#each group.settings as setting (setting.id)}
        <SettingItem {setting} {fullLabel} />
      {/each}
    </div>
  </Card>
{:else}
  <p class="py-8 text-center text-muted-foreground">{empty}</p>
{/each}
