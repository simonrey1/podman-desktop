<script lang="ts">
import type { Terminal } from '@xterm/xterm';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import SessionHeader from '#lib/components/container/SessionHeader.svelte';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// streams the logs of the container in a read-only terminal, until the session is closed
const app = getApp();
let current: Terminal | undefined;

// keep the colors of the terminal in sync with the theme
$effect(() => {
  if (app.theme.revision && current) {
    current.options.theme = terminalTheme();
  }
});

const logs: Attachment<HTMLElement> = element => {
  const { terminal, dispose } = openTerminal(element, { disableStdin: true });
  current = terminal;
  let tokenId: number | undefined;
  let closed = false;

  window
    .getCancellableTokenSource()
    .then(id => {
      tokenId = id;
      if (closed) {
        return window.cancelToken(id);
      }
      return window.logsContainer({
        engineId: view.params.engineId,
        containerId: view.params.containerId,
        cancellableTokenId: id,
        callback: (name: string, data: string): void => {
          if (name === 'data') {
            terminal.write(`${data}\r`);
          }
        },
      });
    })
    .catch((error: unknown) => terminal.write(`Error reading the logs: ${String(error)}\r\n`));

  return (): void => {
    closed = true;
    if (tokenId !== undefined) {
      window.cancelToken(tokenId).catch((error: unknown) => console.error('Error stopping the logs', error));
    }
    dispose();
  };
};
</script>

<div class="flex h-full flex-col bg-terminal">
  <SessionHeader engineId={view.params.engineId} containerId={view.params.containerId} />
  <!-- the padding is outside the terminal element: xterm fits the terminal to the size of its element -->
  <div class="min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach logs}></div>
  </div>
</div>
