<script lang="ts">
import ListChecksIcon from '@lucide/svelte/icons/list-checks';
import PanelBottomIcon from '@lucide/svelte/icons/panel-bottom';

import { receive } from '#lib/api/events.js';
import { getApp } from '#lib/app.svelte.js';
import { Kbd } from '#lib/components/ui/kbd/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import * as Tooltip from '#lib/components/ui/tooltip/index.js';
import { viewRef } from '#lib/views/index.js';

const app = getApp();

function openTasks(): void {
  app.workbench.open(viewRef('tasks', {}), { from: 'explorer' });
}

// the command showing the tasks (e.g. from the main process or an extension)
$effect(() => receive('toggle-task-manager', openTasks));

let running = $derived(app.tasks.running.length);
</script>

<footer class="flex h-6 shrink-0 items-center gap-1 bg-chrome px-2 text-xs text-muted-foreground">
  <span class="flex-1"></span>
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <button
          {...props}
          class="flex h-5 items-center gap-1.5 rounded-sm px-1.5 hover:bg-chrome-hover hover:text-foreground"
          onclick={openTasks}>
          {#if running}
            <Spinner size="sm" aria-hidden="true" />
            {running} task{running > 1 ? 's' : ''}
          {:else}
            <ListChecksIcon class="size-3.5" />
            Tasks
          {/if}
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>Show the tasks</Tooltip.Content>
  </Tooltip.Root>
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
