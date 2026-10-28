<script lang="ts">
import type { Terminal } from '@xterm/xterm';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import SessionHeader from '#lib/components/container/SessionHeader.svelte';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// opens a shell in the container, the session ends when the shell exits
const app = getApp();
let current: Terminal | undefined;

// keep the colors of the terminal in sync with the theme
$effect(() => {
  if (app.theme.revision && current) {
    current.options.theme = terminalTheme();
  }
});

const shell: Attachment<HTMLElement> = element => {
  const { terminal, dispose } = openTerminal(element, { disableStdin: false });
  current = terminal;

  window
    .shellInContainer(
      view.params.engineId,
      view.params.containerId,
      data => terminal.write(data.toString()),
      error => terminal.write(`\r\n${error}\r\n`),
      () => terminal.write('\r\n[shell exited]\r\n'),
    )
    .then(async id => {
      terminal.onData(data => {
        window
          .shellInContainerSend(id, data)
          .catch((error: unknown) => console.error('Error sending to the shell', error));
      });
      terminal.onResize(({ cols, rows }) => {
        window
          .shellInContainerResize(id, cols, rows)
          .catch((error: unknown) => console.error('Error resizing the shell', error));
      });
      await window.shellInContainerResize(id, terminal.cols, terminal.rows);
      terminal.focus();
    })
    .catch((error: unknown) => terminal.write(`Error opening a shell: ${String(error)}\r\n`));

  // the preload API has no call to close the shell: it ends when it exits or when the container stops
  return dispose;
};
</script>

<div class="flex h-full flex-col bg-terminal">
  <SessionHeader engineId={view.params.engineId} containerId={view.params.containerId} />
  <!-- the padding is outside the terminal element: xterm fits the terminal to the size of its element -->
  <div class="min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach shell}></div>
  </div>
</div>
