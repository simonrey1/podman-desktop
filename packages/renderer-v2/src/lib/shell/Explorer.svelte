<script lang="ts">
import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import SettingsIcon from '@lucide/svelte/icons/settings';

import { getApp } from '#lib/app.svelte.js';
import FilterInput from '#lib/components/FilterInput.svelte';
import ImageIcon from '#lib/components/ImageIcon.svelte';
import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
import * as Sidebar from '#lib/components/ui/sidebar/index.js';
import { viewKey, type ViewRef, viewRef } from '#lib/views/index.js';

import EngineSwitcher from './EngineSwitcher.svelte';
import { explorerEntries } from './explorer.js';

const app = getApp();

let filter = $state('');

let engine = $derived(app.engines.selected);
let query = $derived(filter.trim().toLowerCase());
let entries = $derived(
  (engine ? explorerEntries(app, engine.id) : []).filter(entry => entry.label.toLowerCase().includes(query)),
);

let webviews = $derived(app.webviews.items.filter(webview => webview.name.toLowerCase().includes(query)));

function isActive(ref: ViewRef): boolean {
  return app.workbench.editor.activeKey === viewKey(ref);
}

// a single click opens a preview tab, a double click (or Enter) keeps it open
function preview(ref: ViewRef): void {
  app.workbench.open(ref, { preview: true, from: 'explorer' });
}

function keep(ref: ViewRef): void {
  app.workbench.open(ref, { from: 'explorer' });
}

function onkeydown(event: KeyboardEvent, ref: ViewRef): void {
  if (event.key === 'Enter') {
    // not a click: Enter keeps the tab open
    event.preventDefault();
    keep(ref);
  }
}
</script>

<Sidebar.Root collapsible="none">
  <Sidebar.Header>
    <EngineSwitcher />
    <FilterInput bind:value={filter} placeholder="Filter" />
  </Sidebar.Header>
  <Sidebar.Content>
    <ScrollArea>
      {#if engine}
        <Sidebar.Group>
          <Sidebar.Menu>
            {#each entries as entry (entry.id)}
              <Sidebar.MenuItem>
                <Sidebar.MenuButton
                  size="sm"
                  isActive={isActive(entry.ref)}
                  onclick={(): void => preview(entry.ref)}
                  ondblclick={(): void => keep(entry.ref)}
                  onkeydown={(event): void => onkeydown(event, entry.ref)}>
                  <entry.icon />
                  <span>{entry.label}</span>
                </Sidebar.MenuButton>
                {#if entry.count !== undefined}
                  <Sidebar.MenuBadge>{entry.count}</Sidebar.MenuBadge>
                {/if}
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.Group>
      {:else if app.engines.loaded}
        <p class="px-4 py-2 text-muted-foreground">No container engine</p>
      {/if}
      {#if webviews.length}
        <!-- the pages of the extensions -->
        <Sidebar.Group>
          <Sidebar.GroupLabel>Extensions</Sidebar.GroupLabel>
          <Sidebar.Menu>
            {#each webviews as webview (webview.id)}
              {@const ref = viewRef('webview', { viewType: webview.viewType, sourcePath: webview.sourcePath })}
              <Sidebar.MenuItem>
                <!-- a link: the menu of the development mode opens the DevTools of a /webviews/ link. Kept open: what is
                     done in a page is not seen from here, a preview tab would lose it -->
                <Sidebar.MenuButton size="sm" isActive={isActive(ref)}>
                  {#snippet child({ props })}
                    <a
                      {...props}
                      href="/webviews/{webview.id}"
                      onclick={(event): void => {
                        event.preventDefault();
                        keep(ref);
                      }}>
                      {#if webview.icon}
                        <ImageIcon icon={webview.icon} class="size-4" />
                      {:else}
                        <PuzzleIcon />
                      {/if}
                      <span>{webview.name}</span>
                    </a>
                  {/snippet}
                </Sidebar.MenuButton>
              </Sidebar.MenuItem>
            {/each}
          </Sidebar.Menu>
        </Sidebar.Group>
      {/if}
    </ScrollArea>
  </Sidebar.Content>
  <!-- what is not about the engine: the extensions and the settings -->
  <Sidebar.Footer>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          size="sm"
          isActive={isActive(viewRef('extensions', {}))}
          onclick={(): void => keep(viewRef('extensions', {}))}>
          <PuzzleIcon />
          <span>Extensions</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          size="sm"
          isActive={isActive(viewRef('settings', {}))}
          onclick={(): void => keep(viewRef('settings', {}))}>
          <SettingsIcon />
          <span>Settings</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>
