<script lang="ts">
import SearchIcon from '@lucide/svelte/icons/search';
import type { Terminal } from '@xterm/xterm';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.svelte.js';
import ConnectionSessionHeader from '#lib/components/engine/ConnectionSessionHeader.svelte';
import FindWidget from '#lib/components/search/FindWidget.svelte';
import type { SearchTarget } from '#lib/components/search/search.js';
import { terminalSearch } from '#lib/components/search/terminal-search.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the output of the lifecycle operations of the connection, in a read-only terminal: since this window opened, then as
// it comes
const app = getApp();

let terminal: Terminal | undefined = $state.raw();
let search: SearchTarget | undefined = $state.raw();
let empty = $state(true);

// keep the colors of the terminal in sync with the theme
$effect(() => {
  if (app.theme.revision && terminal) {
    terminal.options.theme = terminalTheme();
  }
});

const output: Attachment<HTMLElement> = element => {
  const opened = openTerminal(element, { disableStdin: true }, app);
  search = terminalSearch(opened.terminal);
  terminal = opened.terminal;
  return (): void => {
    terminal = undefined;
    search = undefined;
    opened.dispose();
  };
};

$effect(() => {
  const target = terminal;
  const connectionId = view.params.connectionId;
  if (!target) {
    return;
  }
  target.reset();
  return app.connectionLogs.onOutput(connectionId, data => {
    empty = false;
    target.write(data);
  });
});
</script>

<div class="flex h-full flex-col bg-terminal">
  <ConnectionSessionHeader connectionId={view.params.connectionId}>
    {#snippet actions()}
      <ActionButton icon={SearchIcon} label="Find (Ctrl+F)" size="icon-xs" onclick={(): void => search?.requestFind()} />
    {/snippet}
  </ConnectionSessionHeader>
  <div class="relative min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach output}></div>
    {#if empty}
      <div class="absolute inset-0 flex items-center justify-center bg-terminal text-muted-foreground">
        No operation yet: the output of the next start, stop or edit shows here.
      </div>
    {/if}
    <FindWidget target={search} />
  </div>
</div>
