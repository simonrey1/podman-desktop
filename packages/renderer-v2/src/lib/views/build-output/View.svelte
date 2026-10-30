<script lang="ts">
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
import CircleXIcon from '@lucide/svelte/icons/circle-x';
import HammerIcon from '@lucide/svelte/icons/hammer';
import SearchIcon from '@lucide/svelte/icons/search';
import type { Terminal } from '@xterm/xterm';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.svelte.js';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import FindWidget from '#lib/components/search/FindWidget.svelte';
import type { SearchTarget } from '#lib/components/search/search.js';
import { terminalSearch } from '#lib/components/search/terminal-search.js';
import { Badge } from '#lib/components/ui/badge/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the output of a build, in a read-only terminal: from its start, then as it comes
const app = getApp();

let build = $derived(app.builds.get(view.params.buildId));
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

// the output of the build (none after a restart: the builds are not kept)
$effect(() => {
  const target = terminal;
  if (!target || !build) {
    return;
  }
  target.reset();
  // the engine sends lines: the terminal needs carriage returns
  return build.onOutput(data => target.write(data.replaceAll(/\r?\n/g, '\r\n')));
});
</script>

<div class="flex h-full flex-col bg-terminal">
  <div class="bar h-tabs items-center gap-2 px-3">
    <HammerIcon class="size-4 shrink-0 text-muted-foreground" />
    <span class="min-w-0 truncate font-medium">{build?.request.imageName ?? 'Build'}</span>
    {#if build}
      <!-- the icons of the status of the build form -->
      <Badge variant="outline">
        {#if build.status === 'running'}
          <Spinner size="sm" />
        {:else if build.status === 'succeeded'}
          <CircleCheckIcon class="text-state-success" />
        {:else if build.status === 'failed'}
          <CircleXIcon class="text-state-error" />
        {:else}
          <CircleStopIcon class="text-muted-foreground" />
        {/if}
        {build.status}
      </Badge>
      <EngineBadge engineId={build.request.engineId} />
    {/if}
    <div class="ms-auto flex items-center gap-1">
      <ActionButton icon={SearchIcon} label="Find (Ctrl+F)" size="icon-xs" onclick={(): void => search?.requestFind()} />
      {#if build?.status === 'running'}
        <ActionButton
          icon={CircleStopIcon}
          label="Cancel the build"
          size="icon-xs"
          onclick={(): void => {
            build?.cancel().catch(console.error);
          }} />
      {/if}
    </div>
  </div>
  <div class="relative min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach output}></div>
    {#if !build}
      <div class="absolute inset-0 flex items-center justify-center bg-terminal text-muted-foreground">
        The output of this build is not available anymore.
      </div>
    {/if}
    <FindWidget target={search} />
  </div>
</div>
