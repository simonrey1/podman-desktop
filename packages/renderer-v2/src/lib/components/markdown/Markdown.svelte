<script lang="ts">
import { micromark } from 'micromark';
import { directive, directiveHtml } from 'micromark-extension-directive';
import { toast } from 'svelte-sonner';

import { errorMessage } from '#lib/stores/actions.svelte.js';

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

/** runs the command of a button or a link: the button is busy meanwhile, a failure shows in a toast */
function run(element: HTMLElement, command: string): void {
  const button = element instanceof HTMLButtonElement ? element : undefined;
  if (button?.disabled) {
    return;
  }
  if (button) {
    button.disabled = true;
    button.dataset.running = '';
  }
  // the arguments are given as one string
  const args = element.dataset.args === undefined ? [] : [element.dataset.args];
  window
    .executeCommand(command, ...args)
    .catch((error: unknown) =>
      toast.error(`${element.textContent?.trim() || command} failed`, {
        description: errorMessage(error),
        duration: 8000,
      }),
    )
    .finally(() => {
      if (button) {
        button.disabled = false;
        delete button.dataset.running;
      }
    });
}

function onclick(event: MouseEvent): void {
  const element = (event.target as HTMLElement).closest<HTMLElement>('[data-command], a');
  if (!element) {
    return;
  }
  event.preventDefault();
  const command = element.dataset.command;
  if (command) {
    run(element, command);
  } else if (element instanceof HTMLAnchorElement && /^https?:/.test(element.href)) {
    window.openExternal(element.href).catch((error: unknown) => console.error('Error opening a link', error));
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
  /* like the default buttons */
  .markdown :global(.markdown-button) {
    display: inline-flex;
    align-items: center;
    height: 1.75rem;
    margin-block: 0.25rem;
    padding-inline: 0.625rem;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
  }
  .markdown :global(.markdown-button:hover) {
    background: color-mix(in oklab, var(--color-primary) 85%, transparent);
  }
  .markdown :global(.markdown-button:disabled) {
    opacity: 0.6;
    cursor: default;
  }
  .markdown :global(.markdown-button[data-running])::after {
    content: '…';
  }
  .markdown :global(code) {
    font-family: var(--font-mono);
    font-size: 0.9em;
  }
</style>
