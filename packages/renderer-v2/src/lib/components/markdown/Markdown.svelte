<script lang="ts">
import { micromark } from 'micromark';
import { directive, directiveHtml } from 'micromark-extension-directive';

import { directiveHandlers } from './directives.js';

interface Props {
  markdown: string;
}

// markdown from the main process or an extension (e.g. the message of a dialog); its links open in the browser
let { markdown }: Props = $props();

// micromark does not keep the HTML of the markdown: the result is safe to insert
let html = $derived(
  micromark(markdown, { extensions: [directive()], htmlExtensions: [directiveHtml(directiveHandlers)] }),
);

function onclick(event: MouseEvent): void {
  const link = (event.target as HTMLElement).closest('a');
  if (link) {
    event.preventDefault();
    if (/^https?:/.test(link.href)) {
      window.openExternal(link.href).catch((error: unknown) => console.error('Error opening a link', error));
    }
  }
}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="markdown" {onclick}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- micromark escapes the HTML of the markdown -->
  {@html html}
</div>

<style>
  .markdown :global(p + p),
  .markdown :global(ul),
  .markdown :global(ol) {
    margin-top: 0.5rem;
  }
  .markdown :global(ul) {
    list-style: disc;
    padding-inline-start: 1.25rem;
  }
  .markdown :global(ol) {
    list-style: decimal;
    padding-inline-start: 1.25rem;
  }
  .markdown :global(a) {
    color: var(--color-primary);
    text-decoration: underline;
  }
  .markdown :global(.markdown-image) {
    display: block;
    max-width: 100%;
    height: auto;
    margin-block: 0.5rem;
    border-radius: var(--radius-md);
  }
  .markdown :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }
</style>
