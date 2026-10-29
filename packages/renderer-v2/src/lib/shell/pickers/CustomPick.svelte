<script lang="ts">
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import { untrack } from 'svelte';

import { getApp } from '#lib/app.svelte.js';
import Markdown from '#lib/components/markdown/Markdown.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import * as Collapsible from '#lib/components/ui/collapsible/index.js';
import type { CustomPickRequest } from '#lib/stores/pickers.svelte.js';

interface Props {
  request: CustomPickRequest;
  /** the cards selected (by index), on Next */
  onChoose: (indexes: number[]) => void;
  onCancel: () => void;
}

// the cards of an extension (e.g. the kinds of a resource to create): a click selects one, or several when allowed
let { request, onChoose, onCancel }: Props = $props();

const app = getApp();

// starts from the cards selected by the extension (a new request is a new component)
let selected: Record<number, boolean> = $state(
  untrack(() => Object.fromEntries(request.items.map((item, index) => [index, !!item.selected]))),
);

let icon = $derived(
  typeof request.icon === 'object' ? request.icon[app.theme.isDark ? 'dark' : 'light'] : request.icon,
);

// three cards per row, unless the last row would hold one card only
let columns = $derived(request.items.length > 2 && request.items.length % 3 !== 1 ? 3 : 2);

function toggle(index: number): void {
  const next = !selected[index];
  if (next && !request.canSelectMany) {
    selected = {};
  }
  selected[index] = next;
}

function onkeydown(event: KeyboardEvent, index: number): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggle(index);
  }
}
</script>

<div class="flex max-h-160 flex-col">
  <div class="flex flex-col items-center gap-1 border-b px-5 py-4 text-center">
    {#if icon}
      <img src={icon} alt="" class="mb-2 max-h-12" />
    {/if}
    {#if request.title}
      <h2 class="text-xl font-semibold">{request.title}</h2>
    {/if}
    {#if request.description}
      <p class="text-muted-foreground">{request.description}</p>
    {/if}
  </div>
  <div
    class={['grid min-h-0 gap-3 overflow-y-auto p-5', columns === 3 ? 'grid-cols-3' : 'grid-cols-2']}
    role="listbox"
    aria-multiselectable={request.canSelectMany}
    aria-label={request.title ?? 'Items'}>
    {#each request.items as item, index (index)}
      <div
        class={[
          'relative flex min-h-(--card-min-height) cursor-pointer flex-col gap-2 rounded-lg border bg-card p-3 outline-none hover:border-primary focus-visible:ring-1 focus-visible:ring-ring',
          selected[index] && 'border-primary ring-1 ring-primary',
        ]}
        style:--card-min-height={request.minHeight}
        role="option"
        aria-selected={!!selected[index]}
        tabindex="0"
        onclick={(event): void => {
          // the details fold without selecting the card
          if (!(event.target as HTMLElement).closest('[data-slot=collapsible-trigger]')) {
            toggle(index);
          }
        }}
        onkeydown={(event): void => onkeydown(event, index)}>
        {#if selected[index]}
          <CircleCheckIcon class="absolute top-3 right-3 size-4 text-primary" />
        {/if}
        <div class="flex items-baseline gap-2 pe-6">
          <span class="font-semibold">{item.title}</span>
          {#if item.description}
            <span class="text-xs text-muted-foreground">{item.description}</span>
          {/if}
        </div>
        <div class="text-xs">
          <Markdown markdown={item.markDownContent} />
        </div>
        {#if item.sections?.length}
          <Collapsible.Root open={!request.hideItemSections}>
            <Collapsible.Trigger>
              {#snippet child({ props })}
                <Button {...props} variant="link" size="xs">
                  {props['data-state'] === 'open' ? 'Hide details' : 'Show details'}
                </Button>
              {/snippet}
            </Collapsible.Trigger>
            <Collapsible.Content>
              <div class="mt-1 flex flex-col gap-2 border-t pt-2 text-xs">
                {#each item.sections as section, sectionIndex (sectionIndex)}
                  <div>
                    <p class="font-medium text-muted-foreground uppercase">{section.title}</p>
                    {#if section.content}
                      <p>{section.content}</p>
                    {/if}
                    {#if section.markDownContent}
                      <Markdown markdown={section.markDownContent} />
                    {/if}
                  </div>
                {/each}
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
        {/if}
      </div>
    {/each}
  </div>
  <div class="flex justify-end gap-2 border-t px-5 py-3">
    <Button variant="outline" onclick={onCancel}>Cancel</Button>
    <Button
      onclick={(): void => onChoose(request.items.map((_, index) => index).filter(index => selected[index]))}>
      Next
    </Button>
  </div>
</div>
