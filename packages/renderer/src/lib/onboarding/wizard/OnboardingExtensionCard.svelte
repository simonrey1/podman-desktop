<script lang="ts">
import { Checkbox } from '@podman-desktop/ui-svelte';

import IconImage from '/@/lib/appearance/IconImage.svelte';

interface Props {
  icon?: string | { readonly light: string; readonly dark: string };
  displayName: string;
  description?: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}

let { icon, displayName, description = '', checked = $bindable(), onToggle }: Props = $props();

function handleToggle(): void {
  checked = !checked;
  onToggle(checked);
}
</script>

<button
  type="button"
  class={[
    'flex w-full cursor-pointer items-center gap-4 rounded-lg border px-5 py-4 text-left transition-colors',
    checked
      ? 'border-(--pd-content-card-border-selected) bg-(--pd-content-card-inset-bg)'
      : 'border-(--pd-content-card-border) bg-(--pd-content-card-inset-bg) opacity-75',
  ]}
  onclick={handleToggle}>
  <Checkbox checked={checked} title="{displayName} checkbox" class="shrink-0" />

  {#if icon}
    <IconImage image={icon} class="h-10 w-10 shrink-0" alt="{displayName} logo" />
  {/if}

  <div class="min-w-0 flex-1">
    <div class="text-sm font-semibold text-(--pd-content-header)">{displayName}</div>
    {#if description}
      <div class="mt-0.5 text-xs text-(--pd-content-card-text)">{description}</div>
    {/if}
  </div>
</button>
