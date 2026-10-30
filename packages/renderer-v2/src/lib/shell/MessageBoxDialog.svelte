<script lang="ts">
import type { DropdownType } from '@desktop-framework/api';
import type { LucideIcon } from '@lucide/svelte';
import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
import CircleQuestionMarkIcon from '@lucide/svelte/icons/circle-question-mark';
import InfoIcon from '@lucide/svelte/icons/info';
import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
import XIcon from '@lucide/svelte/icons/x';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import Markdown from '#lib/components/markdown/Markdown.svelte';
import * as AlertDialog from '#lib/components/ui/alert-dialog/index.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as DropdownMenu from '#lib/components/ui/dropdown-menu/index.js';

// the message boxes asked by the main process or the extensions: closing it answers with the cancel button
const app = getApp();
const messageBoxes = app.messageBoxes;

let box = $derived(messageBoxes.current);

const ICONS: Partial<Record<string, { icon: LucideIcon; class: string }>> = {
  error: { icon: CircleAlertIcon, class: 'text-state-error' },
  danger: { icon: CircleAlertIcon, class: 'text-state-error' },
  warning: { icon: TriangleAlertIcon, class: 'text-state-warning' },
  info: { icon: InfoIcon, class: 'text-muted-foreground' },
  question: { icon: CircleQuestionMarkIcon, class: 'text-muted-foreground' },
};

let media = $derived(box?.request.type ? ICONS[box.request.type] : undefined);

function variant(index: number): 'default' | 'destructive' | 'outline' {
  if (index !== box?.defaultId || index === box.cancelId) {
    return 'outline';
  }
  return box.request.type === 'danger' ? 'destructive' : 'default';
}
</script>

<AlertDialog.Root
  open={!!box}
  onOpenChange={(open): void => {
    if (!open) {
      messageBoxes.dismiss();
    }
  }}>
  <AlertDialog.Content>
    {#if box}
      <AlertDialog.Header>
        {#if media}
          <AlertDialog.Media>
            <media.icon class={media.class} />
          </AlertDialog.Media>
        {/if}
        <AlertDialog.Title>{box.request.title}</AlertDialog.Title>
        <ActionButton icon={XIcon} label="Close" size="icon-sm" onclick={(): void => messageBoxes.dismiss()} />
      </AlertDialog.Header>
      <AlertDialog.Description>
        {#snippet child({ props })}
          <div {...props}>
            <Markdown markdown={box.request.message} />
            {#if box.request.footerMarkdownDescription}
              <div class="mt-4">
                <Markdown markdown={box.request.footerMarkdownDescription} />
              </div>
            {/if}
            {#if box.request.detail}
              <p class="mt-4 whitespace-pre-line text-muted-foreground">{box.request.detail}</p>
            {/if}
          </div>
        {/snippet}
      </AlertDialog.Description>
      <AlertDialog.Footer>
        {#each box.order as index (index)}
          {@const button = box.buttons[index]}
          {#if typeof button === 'string'}
            <Button variant={variant(index)} onclick={(): void => messageBoxes.answer(index)}>{button}</Button>
          {:else if button.type === 'dropdownButton'}
            {@const dropdown = button as DropdownType}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                {#snippet child({ props })}
                  <Button {...props} variant={variant(index)}>
                    {dropdown.heading}
                    <ChevronDownIcon data-icon="inline-end" />
                  </Button>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                {#each dropdown.buttons as option, optionIndex (optionIndex)}
                  <DropdownMenu.Item onSelect={(): void => messageBoxes.answer(index, optionIndex)}>{option}</DropdownMenu.Item>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          {:else}
            <!-- the icons of the extensions are icon fonts, not loaded yet: the label only -->
            <Button variant={variant(index)} onclick={(): void => messageBoxes.answer(index)}>{button.label}</Button>
          {/if}
        {/each}
      </AlertDialog.Footer>
    {/if}
  </AlertDialog.Content>
</AlertDialog.Root>
