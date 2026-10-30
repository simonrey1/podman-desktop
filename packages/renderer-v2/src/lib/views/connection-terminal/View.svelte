<script lang="ts">
import type { Terminal } from '@xterm/xterm';
import { untrack } from 'svelte';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import { openTerminal, terminalTheme } from '#lib/components/container/terminal.svelte.js';
import ConnectionSessionHeader from '#lib/components/engine/ConnectionSessionHeader.svelte';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// a shell in the connection while it is started: a new one each time it starts again, closed with the session
const app = getApp();

let connection = $derived(app.engines.connection(view.params.connectionId));
let started = $derived(connection?.info.status === 'started');
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

/** opens a shell in the terminal, @returns a function closing it */
function shell(target: Terminal): () => void {
  const listeners: { dispose: () => void }[] = [];
  let closed = false;
  let id: number | undefined;
  const current = connection;
  if (!current) {
    return (): void => {};
  }
  window
    .shellInProviderConnection(
      current.provider.internalId,
      $state.snapshot(current.info) as typeof current.info,
      data => target.write(data),
      error => target.write(`\r\n${error}\r\n`),
      () => target.write('\r\n[shell exited]\r\n'),
    )
    .then(async shellId => {
      id = shellId;
      if (closed) {
        await window.shellInProviderConnectionClose(shellId);
        return;
      }
      listeners.push(
        target.onData(data => {
          window
            .shellInProviderConnectionSend(shellId, data)
            .catch((error: unknown) => console.error('Error sending to the shell', error));
        }),
        target.onResize(({ cols, rows }) => {
          window
            .shellInProviderConnectionResize(shellId, { cols, rows })
            .catch((error: unknown) => console.error('Error resizing the shell', error));
        }),
      );
      await window.shellInProviderConnectionResize(shellId, { cols: target.cols, rows: target.rows });
      target.focus();
    })
    .catch((error: unknown) => target.write(`Error opening a shell: ${String(error)}\r\n`));
  return (): void => {
    closed = true;
    listeners.forEach(listener => listener.dispose());
    if (id !== undefined) {
      window.shellInProviderConnectionClose(id).catch(console.error);
    }
  };
}

// a shell for each start of the connection (the previous one ended when it stopped)
$effect(() => {
  const target = terminal;
  if (!target || !started) {
    return;
  }
  target.reset();
  return untrack(() => shell(target));
});
</script>

<div class="flex h-full flex-col bg-terminal">
  <ConnectionSessionHeader connectionId={view.params.connectionId} />
  <!-- the padding is outside the terminal element: xterm fits the terminal to the size of its element -->
  <div class="relative min-h-0 flex-1 px-3 py-1.5">
    <div class="h-full w-full" {@attach attach}></div>
    {#if connection && !started}
      <div class="absolute inset-0 flex items-center justify-center bg-terminal text-muted-foreground">
        {connection.name} is not started: a shell opens when it starts.
      </div>
    {/if}
  </div>
</div>
