<script lang="ts">
import type { Terminal } from '@xterm/xterm';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import SessionHeader from '#lib/components/container/SessionHeader.svelte';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.svelte.js';
import { containerName } from '#lib/stores/containers.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the TTY of the container (its main process, started with a terminal and an open input) while it runs: attached
// again each time it starts
const app = getApp();

let container = $derived(app.containers.get(view.params.engineId, view.params.containerId));
let running = $derived(container?.State === 'running');
let started = $derived(container?.StartedAt);
let terminal: Terminal | undefined = $state.raw();

// keep the colors of the terminal in sync with the theme
$effect(() => {
  if (app.theme.revision && terminal) {
    terminal.options.theme = terminalTheme();
  }
});

const attach: Attachment<HTMLElement> = element => {
  const opened = openTerminal(element, { disableStdin: false }, app);
  terminal = opened.terminal;
  return (): void => {
    terminal = undefined;
    opened.dispose();
  };
};

/** attaches the terminal to the container, @returns a function no longer sending the input of the terminal to it */
function attachTo(target: Terminal): () => void {
  let listener: { dispose: () => void } | undefined;
  let closed = false;
  window
    .attachContainer(
      view.params.engineId,
      view.params.containerId,
      data => target.write(data.toString()),
      error => target.write(`\r\n${error}\r\n`),
      () => target.write('\r\n[detached: the container stopped]\r\n'),
    )
    .then(id => {
      if (closed) {
        return;
      }
      listener = target.onData(data => {
        window
          .attachContainerSend(id, data)
          .catch((error: unknown) => console.error('Error sending to the container', error));
      });
      target.focus();
    })
    .catch((error: unknown) => target.write(`Error attaching to the container: ${String(error)}\r\n`));
  // the preload API has no call to detach: the stream ends when the container stops
  return (): void => {
    closed = true;
    listener?.dispose();
  };
}

// attached for each start of the container (the previous stream ended when it stopped)
$effect(() => {
  const target = terminal;
  if (!target || !running || started === undefined) {
    return;
  }
  target.reset();
  return attachTo(target);
});
</script>

<div class="flex h-full flex-col bg-terminal">
  <SessionHeader engineId={view.params.engineId} containerId={view.params.containerId} />
  <!-- the padding is outside the terminal element: xterm fits the terminal to the size of its element -->
  <div class="relative min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach attach}></div>
    {#if container && !running}
      <!-- hides the output of the last attach -->
      <div class="absolute inset-0 flex items-center justify-center bg-terminal text-muted-foreground">
        {containerName(container)} is not running: its TTY is attached when it starts.
      </div>
    {/if}
  </div>
</div>
