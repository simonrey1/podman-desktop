<script lang="ts">
import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
import type { PaneAPI } from 'paneforge';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import * as Empty from '#lib/components/ui/empty/index.js';
import * as Resizable from '#lib/components/ui/resizable/index.js';
import * as Sidebar from '#lib/components/ui/sidebar/index.js';
import { Toaster } from '#lib/components/ui/sonner/index.js';
import TabGroupView from '#lib/workbench/TabGroupView.svelte';

import ConfirmationDialog from './ConfirmationDialog.svelte';
import Explorer from './Explorer.svelte';
import MessageBoxDialog from './MessageBoxDialog.svelte';
import ModalHost from './ModalHost.svelte';
import PickerDialog from './pickers/PickerDialog.svelte';
import StatusBar from './StatusBar.svelte';
import TitleBar from './TitleBar.svelte';
import TooltipHost from './TooltipHost.svelte';

const app = getApp();
const workbench = app.workbench;

// Ctrl+B (shadcn-svelte sidebar shortcut) collapses the explorer, ` the panel
let explorerOpen = $state(true);
let explorerPane: PaneAPI | undefined = $state();
let panelPane: PaneAPI | undefined = $state();

// the explorer keeps its width in pixels, the editor takes the rest when the window is resized (the panes are sized in
// percents): 14rem by default, the width of the navigation of the settings, until the user resizes it
const EXPLORER_WIDTH_KEY = 'renderer-v2.explorer-width';
const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
let explorerWidth = Number(localStorage.getItem(EXPLORER_WIDTH_KEY)) || 14 * rem;
let shell: HTMLElement | undefined = $state();
// a size set by the shell, not by the user
let fitting = false;

function fitExplorer(): void {
  const total = shell?.clientWidth;
  if (!explorerPane || !total || !explorerOpen) {
    return;
  }
  fitting = true;
  explorerPane.resize(Math.min(40, Math.max(12, (explorerWidth / total) * 100)));
  fitting = false;
}

function explorerResized(size: number): void {
  const total = shell?.clientWidth;
  if (fitting || !total || size <= 0) {
    return;
  }
  explorerWidth = (size / 100) * total;
  localStorage.setItem(EXPLORER_WIDTH_KEY, String(Math.round(explorerWidth)));
}

$effect(() => {
  if (!shell || !explorerPane) {
    return;
  }
  fitExplorer();
  const observer = new ResizeObserver(fitExplorer);
  observer.observe(shell);
  return (): void => observer.disconnect();
});

$effect(() => {
  if (explorerOpen) {
    explorerPane?.expand();
  } else {
    explorerPane?.collapse();
  }
});

$effect(() => {
  if (workbench.panelVisible) {
    panelPane?.expand();
    // the first time, the panel opens at a third of the height (not at its minimum size)
    if (panelPane && panelPane.getSize() < 20) {
      panelPane.resize(30);
    }
  } else {
    panelPane?.collapse();
  }
});

function onkeydown(event: KeyboardEvent): void {
  // ` toggles the panel (when not typing in a field or in a terminal)
  const target = event.target as HTMLElement;
  if (event.key === '`' && !target.closest('input, textarea, .xterm')) {
    event.preventDefault();
    workbench.togglePanel();
  }
}
</script>

<svelte:window {onkeydown} />

<!-- compact layout: full-bleed regions separated by 1px dividers, the dividers resize them -->
<!-- the explorer fills its pane: the pane gives its width -->
<Sidebar.Provider bind:open={explorerOpen} style="--sidebar-width: 100%">
  <div class="flex h-svh w-full flex-col bg-background">
    <TitleBar platform={app.platform} />
    <div class="flex min-h-0 flex-1 border-y" bind:this={shell}>
      <Resizable.PaneGroup direction="horizontal" autoSaveId="renderer-v2.shell">
        <Resizable.Pane
          bind:this={explorerPane}
          defaultSize={20}
          minSize={12}
          maxSize={40}
          collapsible
          collapsedSize={0}
          onResize={explorerResized}
          onCollapse={(): boolean => (explorerOpen = false)}
          onExpand={(): void => {
            explorerOpen = true;
            fitExplorer();
          }}>
          <Explorer />
        </Resizable.Pane>
        <Resizable.Handle />
        <Resizable.Pane defaultSize={80} minSize={30}>
          <!-- not saved: the panel is hidden at startup, its sessions are not restored -->
          <Resizable.PaneGroup direction="vertical">
            <Resizable.Pane defaultSize={100} minSize={20}>
              <main class="flex h-full min-h-0 flex-col">
                <TabGroupView group={workbench.editor} label="Editor" />
              </main>
            </Resizable.Pane>
            {#if workbench.panelVisible}
              <Resizable.Handle />
            {/if}
            <!-- collapsed rather than removed: the logs and the terminals keep running while the panel is hidden -->
            <Resizable.Pane
              bind:this={panelPane}
              defaultSize={0}
              minSize={10}
              collapsible
              collapsedSize={0}
              onCollapse={(): boolean => (workbench.panelVisible = false)}
              onExpand={(): boolean => (workbench.panelVisible = true)}>
              <section class="flex h-full min-h-0 flex-col">
                <TabGroupView group={workbench.panel} label="Sessions" title>
                  {#snippet actions()}
                    <ActionButton
                      icon={ChevronDownIcon}
                      label="Minimize the panel"
                      size="icon-xs"
                      onclick={(): void => workbench.togglePanel()} />
                  {/snippet}
                  {#snippet empty()}
                    <Empty.Root>
                      <Empty.Header>
                        <Empty.Title>No session</Empty.Title>
                        <Empty.Description>Open the logs or a terminal of a container.</Empty.Description>
                      </Empty.Header>
                    </Empty.Root>
                  {/snippet}
                </TabGroupView>
              </section>
            </Resizable.Pane>
          </Resizable.PaneGroup>
        </Resizable.Pane>
      </Resizable.PaneGroup>
    </div>
    <StatusBar />
  </div>
</Sidebar.Provider>

<ConfirmationDialog />
<MessageBoxDialog />
<PickerDialog />
<ModalHost />
<TooltipHost />

<!-- the results of the actions, e.g. their failures -->
<Toaster theme={app.theme.isDark ? 'dark' : 'light'} position="bottom-right" />
