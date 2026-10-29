<script lang="ts">
import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
import EraserIcon from '@lucide/svelte/icons/eraser';
import { SearchAddon } from '@xterm/addon-search';
import type { Terminal } from '@xterm/xterm';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import SessionHeader from '#lib/components/container/SessionHeader.svelte';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.js';
import FilterInput from '#lib/components/FilterInput.svelte';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// streams the logs of the container in a read-only terminal, until the session is closed
const app = getApp();

let container = $derived(app.containers.get(view.params.engineId, view.params.containerId));
let terminal: Terminal | undefined = $state.raw();
let searchAddon: SearchAddon | undefined;
let search = $state('');

// keep the colors of the terminal in sync with the theme
$effect(() => {
  if (app.theme.revision && terminal) {
    terminal.options.theme = terminalTheme();
  }
});

const logs: Attachment<HTMLElement> = element => {
  const opened = openTerminal(element, { disableStdin: true });
  searchAddon = new SearchAddon();
  opened.terminal.loadAddon(searchAddon);
  terminal = opened.terminal;
  return (): void => {
    terminal = undefined;
    opened.dispose();
  };
};

/** streams the logs (the ones after `since`) to the terminal, @returns a function stopping the stream */
function stream(target: Terminal, since: string | undefined): () => void {
  let tokenId: number | undefined;
  let stopped = false;
  window
    .getCancellableTokenSource()
    .then(id => {
      tokenId = id;
      if (stopped) {
        return window.cancelToken(id);
      }
      return window.logsContainer({
        engineId: view.params.engineId,
        containerId: view.params.containerId,
        cancellableTokenId: id,
        since,
        callback: (name: string, data: string): void => {
          if (name === 'data') {
            target.write(`${data}\r`);
          }
        },
      });
    })
    .catch((error: unknown) => target.write(`Error reading the logs: ${String(error)}\r\n`));
  return (): void => {
    stopped = true;
    if (tokenId !== undefined) {
      window.cancelToken(tokenId).catch((error: unknown) => console.error('Error stopping the logs', error));
    }
  };
}

// the stream ends when the container stops: a new one starts each time it starts again, and after Clear
$effect(() => {
  const target = terminal;
  const since = view.state.since;
  // changed by a new start of the container: its logs are read again (undefined until the containers are loaded)
  const started = container?.StartedAt;
  if (!target || started === undefined) {
    return;
  }
  target.reset();
  return stream(target, since);
});

// the search highlights the next match as it is typed
$effect(() => {
  if (search) {
    searchAddon?.findNext(search, { incremental: true });
  } else {
    searchAddon?.clearDecorations();
  }
});
</script>

<div class="flex h-full flex-col bg-terminal">
  <SessionHeader engineId={view.params.engineId} containerId={view.params.containerId}>
    {#snippet actions()}
      <div class="w-56">
        <FilterInput bind:value={search} placeholder="Search the logs" />
      </div>
      <ActionButton
        icon={ChevronUpIcon}
        label="Previous match"
        size="icon-xs"
        disabled={!search}
        onclick={(): boolean | undefined => searchAddon?.findPrevious(search)} />
      <ActionButton
        icon={ChevronDownIcon}
        label="Next match"
        size="icon-xs"
        disabled={!search}
        onclick={(): boolean | undefined => searchAddon?.findNext(search)} />
      <ActionButton
        icon={EraserIcon}
        label="Clear the logs"
        size="icon-xs"
        onclick={(): string => (view.state.since = new Date().toISOString())} />
    {/snippet}
  </SessionHeader>
  <!-- the padding is outside the terminal element: xterm fits the terminal to the size of its element -->
  <div class="min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach logs}></div>
  </div>
</div>
