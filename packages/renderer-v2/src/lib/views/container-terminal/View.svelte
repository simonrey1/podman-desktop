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

// a shell in the container while it runs: a new one each time it starts again
const app = getApp();

let container = $derived(app.containers.get(view.params.engineId, view.params.containerId));
let running = $derived(container?.State === 'running');
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

/** opens a shell in the terminal, @returns a function no longer sending the input of the terminal to it */
function shell(target: Terminal): () => void {
  const listeners: { dispose: () => void }[] = [];
  let closed = false;
  window
    .shellInContainer(
      view.params.engineId,
      view.params.containerId,
      data => target.write(data.toString()),
      error => target.write(`\r\n${error}\r\n`),
      () => target.write('\r\n[shell exited]\r\n'),
    )
    .then(async id => {
      if (closed) {
        return;
      }
      listeners.push(
        target.onData(data => {
          window
            .shellInContainerSend(id, data)
            .catch((error: unknown) => console.error('Error sending to the shell', error));
        }),
        target.onResize(({ cols, rows }) => {
          window
            .shellInContainerResize(id, cols, rows)
            .catch((error: unknown) => console.error('Error resizing the shell', error));
        }),
      );
      await window.shellInContainerResize(id, target.cols, target.rows);
      target.focus();
    })
    .catch((error: unknown) => target.write(`Error opening a shell: ${String(error)}\r\n`));
  // the preload API has no call to close the shell: it ends when it exits or when the container stops
  return (): void => {
    closed = true;
    listeners.forEach(listener => listener.dispose());
  };
}

// a shell for each start of the container (the previous one ended when it stopped)
$effect(() => {
  const target = terminal;
  const started = container?.StartedAt;
  if (!target || !running || started === undefined) {
    return;
  }
  target.reset();
  return shell(target);
});
</script>

<div class="flex h-full flex-col bg-terminal">
  <SessionHeader engineId={view.params.engineId} containerId={view.params.containerId} />
  <!-- the padding is outside the terminal element: xterm fits the terminal to the size of its element -->
  <div class="relative min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach attach}></div>
    {#if container && !running}
      <!-- hides the output of the last shell -->
      <div class="absolute inset-0 flex items-center justify-center bg-terminal text-muted-foreground">
        {containerName(container)} is not running: a shell opens when it starts.
      </div>
    {/if}
  </div>
</div>
