<script lang="ts">
import EraserIcon from '@lucide/svelte/icons/eraser';
import SearchIcon from '@lucide/svelte/icons/search';
import type { Terminal } from '@xterm/xterm';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import SessionHeader from '#lib/components/container/SessionHeader.svelte';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.js';
import FindWidget from '#lib/components/search/FindWidget.svelte';
import type { SearchTarget } from '#lib/components/search/search.js';
import { terminalSearch } from '#lib/components/search/terminal-search.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// streams the logs of the container in a read-only terminal, until the session is closed
const app = getApp();

let container = $derived(app.containers.get(view.params.engineId, view.params.containerId));
let terminal: Terminal | undefined = $state.raw();
let search: SearchTarget | undefined = $state.raw();

// keep the colors of the terminal in sync with the theme
$effect(() => {
  if (app.theme.revision && terminal) {
    terminal.options.theme = terminalTheme();
  }
});

const logs: Attachment<HTMLElement> = element => {
  const opened = openTerminal(element, { disableStdin: true });
  search = terminalSearch(opened.terminal);
  terminal = opened.terminal;
  return (): void => {
    terminal = undefined;
    search = undefined;
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
</script>

<div class="flex h-full flex-col bg-terminal">
  <SessionHeader engineId={view.params.engineId} containerId={view.params.containerId}>
    {#snippet actions()}
      <ActionButton
        icon={SearchIcon}
        label="Find (Ctrl+F)"
        size="icon-xs"
        onclick={(): void => search?.requestFind()} />
      <ActionButton
        icon={EraserIcon}
        label="Clear the logs"
        size="icon-xs"
        onclick={(): string => (view.state.since = new Date().toISOString())} />
    {/snippet}
  </SessionHeader>
  <!-- the padding is outside the terminal element: xterm fits the terminal to the size of its element -->
  <div class="relative min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach logs}></div>
    <FindWidget target={search} />
  </div>
</div>
