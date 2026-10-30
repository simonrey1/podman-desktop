<script lang="ts">
import type { Attachment } from 'svelte/attachments';

import Markdown from '#lib/components/markdown/Markdown.svelte';
import { Input } from '#lib/components/ui/input/index.js';
import { Textarea } from '#lib/components/ui/textarea/index.js';
import type { InputBoxRequest } from '#lib/stores/pickers.svelte.js';

interface Props {
  request: InputBoxRequest;
  onEnter: (value: string) => void;
  /** @returns the message of the extension when the value is not valid */
  onValidate: (value: string) => Promise<string | undefined>;
}

// a value asked by an extension: Enter (Ctrl/Cmd+Enter when multiline) confirms it, unless the extension rejects it
let { request, onEnter, onValidate }: Props = $props();

// starts from the value of the request (a new request is a new component)
let value = $derived(request.value ?? '');
let error: string | undefined = $state();

// the value is validated as it is typed: only the answer to the last value counts
let validation = 0;
$effect(() => {
  const current = value;
  const id = ++validation;
  onValidate(current)
    .then(message => {
      if (id === validation) {
        error = message;
      }
    })
    .catch((err: unknown) => console.error('Error validating a value', err));
});

function onkeydown(event: KeyboardEvent): void {
  const confirms = event.key === 'Enter' && (!request.multiline || event.ctrlKey || event.metaKey);
  if (confirms) {
    event.preventDefault();
    if (!error) {
      onEnter(value);
    }
  }
}

// focused, with the part of the value asked selected
const focus: Attachment<HTMLElement> = element => {
  const field = element.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
  field?.focus();
  if (request.valueSelection) {
    field?.setSelectionRange(...request.valueSelection);
  }
};
</script>

<div class="flex flex-col gap-2 p-2" {@attach focus}>
  {#if request.title}
    <p class="font-medium">{request.title}</p>
  {/if}
  {#if request.multiline}
    <Textarea bind:value placeholder={request.placeHolder} aria-label={request.prompt ?? request.title ?? 'Value'} aria-invalid={!!error} {onkeydown} />
  {:else}
    <Input
      bind:value
      type={request.password ? 'password' : 'text'}
      placeholder={request.placeHolder}
      aria-label={request.prompt ?? request.title ?? 'Value'}
      aria-invalid={!!error}
      {onkeydown} />
  {/if}
  {#if error}
    <p class="text-xs text-state-error" role="alert">{error}</p>
  {:else}
    <p class="text-xs text-muted-foreground">
      {request.prompt ? `${request.prompt} · ` : ''}{request.multiline ? 'Ctrl+Enter' : 'Enter'} to confirm, Escape to cancel
    </p>
  {/if}
  {#if request.markdownDescription}
    <div class="text-sm">
      <Markdown markdown={request.markdownDescription} />
    </div>
  {/if}
</div>
