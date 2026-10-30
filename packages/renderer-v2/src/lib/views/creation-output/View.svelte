<script lang="ts">
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
import CircleXIcon from '@lucide/svelte/icons/circle-x';
import PlusIcon from '@lucide/svelte/icons/plus';
import SearchIcon from '@lucide/svelte/icons/search';
import type { Terminal } from '@xterm/xterm';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.svelte.js';
import FindWidget from '#lib/components/search/FindWidget.svelte';
import type { SearchTarget } from '#lib/components/search/search.js';
import { terminalSearch } from '#lib/components/search/terminal-search.js';
import { Badge } from '#lib/components/ui/badge/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the output of the creation of a connection, in a read-only terminal: from its start, then as it comes
const app = getApp();

let creation = $derived(app.creations.get(view.params.creationId));
let terminal: Terminal | undefined = $state.raw();
let search: SearchTarget | undefined = $state.raw();

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

// the output of the creation (none after a restart: the creations are not kept)
$effect(() => {
  const target = terminal;
  if (!target || !creation) {
    return;
  }
  target.reset();
  return creation.onOutput(data => target.write(data));
});
</script>

<div class="flex h-full flex-col bg-terminal">
  <div class="bar h-tabs items-center gap-2 px-3">
    <PlusIcon class="size-4 shrink-0 text-muted-foreground" />
    <span class="min-w-0 truncate font-medium">{creation?.request.label ?? 'Creation'}</span>
    {#if creation}
      <!-- the icons of the status of the creation form -->
      <Badge variant="outline">
        {#if creation.status === 'running'}
          <Spinner size="sm" />
        {:else if creation.status === 'succeeded'}
          <CircleCheckIcon class="text-state-success" />
        {:else if creation.status === 'failed'}
          <CircleXIcon class="text-state-error" />
        {:else}
          <CircleStopIcon class="text-muted-foreground" />
        {/if}
        {creation.status}
      </Badge>
      <span class="truncate text-muted-foreground">{creation.request.provider.name}</span>
    {/if}
    <div class="ms-auto flex items-center gap-1">
      <ActionButton icon={SearchIcon} label="Find (Ctrl+F)" size="icon-xs" onclick={(): void => search?.requestFind()} />
      {#if creation?.status === 'running'}
        <ActionButton
          icon={CircleStopIcon}
          label="Cancel the creation"
          size="icon-xs"
          onclick={(): void => {
            creation?.cancel().catch(console.error);
          }} />
      {/if}
    </div>
  </div>
  <div class="relative min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach output}></div>
    {#if !creation}
      <div class="absolute inset-0 flex items-center justify-center bg-terminal text-muted-foreground">
        The output of this creation is not available anymore.
      </div>
    {/if}
    <FindWidget target={search} />
  </div>
</div>
