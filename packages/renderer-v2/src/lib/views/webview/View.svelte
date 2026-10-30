<script lang="ts">
import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import type { Attachment } from 'svelte/attachments';

import { receive } from '#lib/api/events.js';
import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import * as Empty from '#lib/components/ui/empty/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the page of an extension, in a webview tag loading it from the server of the main process; the preload of the
// webview exposes the API of the webviews to the page
const app = getApp();

/** the methods of the webview tag of Electron */
interface WebviewTag extends HTMLElement {
  send(channel: string, ...args: unknown[]): Promise<void>;
  openDevTools(): void;
  getWebContentsId(): number;
}

let webview = $derived(app.webviews.find(view.params));
let id = $derived(webview?.id);
let uuid = $derived(webview?.uuid);

const preload = new AsyncValue<string>(() => window.getWebviewPreloadPath());
const port = new AsyncValue<number>(() => window.getWebviewRegistryHttpPort());
let host = $derived(uuid && port.value ? `http://${uuid}.webview.localhost:${port.value}` : undefined);

let element: WebviewTag | undefined;
// what the extension sent before the page is ready: the tag throws until then
let ready = false;
let pending: [string, unknown][] = [];

function send(channel: string, data: unknown): void {
  if (element && ready) {
    element.send(channel, data).catch((error: unknown) => console.error('Error sending to a webview', error));
  } else {
    pending.push([channel, data]);
  }
}

// an effect per channel of the extension, for this webview
$effect(() =>
  receive<{ id: string; message: unknown }>('webview-post-message', event => {
    if (event.id === id) {
      send('webview-post-message', { message: event.message });
    }
  }),
);
$effect(() =>
  receive<{ id: string; html: string }>('webview-update:html', event => {
    if (event.id === id) {
      send('webview-update-html', event.html);
    }
  }),
);
$effect(() =>
  receive<string>('dev-tools:open-webview', webviewId => {
    if (webviewId === id) {
      element?.openDevTools();
    }
  }),
);

const lifecycle: Attachment<HTMLElement> = target => {
  const tag = target as WebviewTag;
  let contentsId: number | undefined;
  const onReady = (): void => {
    contentsId = tag.getWebContentsId();
    element = tag;
    ready = true;
    for (const [channel, data] of pending.splice(0)) {
      send(channel, data);
    }
  };
  // the main process closes the DevTools with the webview: they crash the application otherwise
  const onDevToolsOpened = (): void => {
    if (contentsId) {
      window
        .registerWebviewDevTools(contentsId)
        .catch((error: unknown) => console.error('Error tracking the DevTools of a webview', error));
    }
  };
  tag.addEventListener('dom-ready', onReady);
  tag.addEventListener('devtools-opened', onDevToolsOpened);
  return (): void => {
    tag.removeEventListener('dom-ready', onReady);
    tag.removeEventListener('devtools-opened', onDevToolsOpened);
    element = undefined;
    ready = false;
    pending = [];
    if (contentsId) {
      window
        .cleanupWebviewDevTools(contentsId)
        .catch((error: unknown) => console.error('Error cleaning the DevTools of a webview', error));
    }
  };
};
</script>

{#if webview && host && preload.value}
  <!-- an extension started again creates another webview -->
  {#key webview.uuid}
    <webview
      {@attach lifecycle}
      class="size-full"
      aria-label="Webview {webview.name}"
      role="document"
      httpreferrer={host}
      src="{host}?webviewId={webview.id}"
      preload={preload.value}></webview>
  {/key}
{:else if app.webviews.started && !webview}
  <Empty.Root>
    <Empty.Header>
      <Empty.Media variant="icon"><PuzzleIcon /></Empty.Media>
      <Empty.Title>This page is not available</Empty.Title>
      <Empty.Description>Its extension is stopped or removed. It shows here again once started.</Empty.Description>
    </Empty.Header>
  </Empty.Root>
{/if}
