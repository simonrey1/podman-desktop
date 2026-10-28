<script lang="ts">
import PanelBottomIcon from '@lucide/svelte/icons/panel-bottom';

import { getApp } from '#lib/app.svelte.js';
import { Kbd } from '#lib/components/ui/kbd/index.js';
import * as Tooltip from '#lib/components/ui/tooltip/index.js';

const app = getApp();
</script>

<footer class="flex h-6 shrink-0 items-center gap-1 bg-chrome px-2 text-xs text-muted-foreground">
  <span class="flex-1"></span>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          class={[
            'flex h-5 items-center gap-1.5 rounded-sm px-1.5 hover:bg-chrome-hover hover:text-foreground',
            app.workbench.panelVisible && 'text-foreground',
          ]}
          aria-pressed={app.workbench.panelVisible}
          onclick={(): void => app.workbench.togglePanel()}>
          <PanelBottomIcon class="size-3.5" />
          Panel
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>Toggle the panel <Kbd>`</Kbd></Tooltip.Content>
  </Tooltip.Root>
  {#if app.version}
    <span class="px-1.5">v{app.version}</span>
  {/if}
</footer>
