<script lang="ts">
import { Button } from '#lib/components/ui/button/index.js';
import { Checkbox } from '#lib/components/ui/checkbox/index.js';
import * as Command from '#lib/components/ui/command/index.js';
import type { QuickPickRequest } from '#lib/stores/pickers.svelte.js';

interface Props {
  request: QuickPickRequest;
  /** the items picked (by index) */
  onPick: (indexes: number[]) => void;
  /** the item highlighted changed */
  onHighlight: (index: number) => void;
}

// the items of an extension, filtered as typed: a click (or Enter) picks one, or checks it when several can be
let { request, onPick, onHighlight }: Props = $props();

let items = $derived(
  request.items.map((item, index) => (typeof item === 'string' ? { label: item, index } : { ...item, index })),
);

// the value of an item for the filter: its label (unique with its index, never typed)
function valueOf(item: { label: string; index: number }): string {
  return `${item.label}\t${item.index}`;
}

function indexOf(value: string): number {
  return Number(value.split('\t').at(-1) ?? -1);
}

let highlighted = $state('');
let checked: Record<number, boolean> = $state({});
let count = $derived(Object.values(checked).filter(Boolean).length);

$effect(() => {
  if (highlighted) {
    onHighlight(indexOf(highlighted));
  }
});

function select(index: number): void {
  if (request.canPickMany) {
    checked[index] = !checked[index];
  } else {
    onPick([index]);
  }
}

function confirm(): void {
  onPick(items.filter(item => checked[item.index]).map(item => item.index));
}

function onkeydown(event: KeyboardEvent): void {
  // Enter checks the item highlighted: Ctrl/Cmd+Enter confirms the items checked
  if (request.canPickMany && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    confirm();
  }
}
</script>

<Command.Root bind:value={highlighted} loop>
  {#if request.title}
    <p class="px-2 pt-1 pb-2 font-medium">{request.title}</p>
  {/if}
  <Command.Input placeholder={request.placeHolder ?? 'Type to filter'} {onkeydown} />
  {#if request.prompt}
    <p class="px-2 pt-2 text-xs text-muted-foreground">{request.prompt}</p>
  {/if}
  <Command.List>
    <Command.Empty>No matching items</Command.Empty>
    {#each items as item (item.index)}
      <Command.Item
        value={valueOf(item)}
        keywords={[item.description ?? '', item.detail ?? '']}
        onSelect={(): void => select(item.index)}>
        {#if request.canPickMany}
          <Checkbox checked={!!checked[item.index]} tabindex={-1} aria-hidden="true" />
        {/if}
        <span class="flex min-w-0 flex-col">
          <span class="flex min-w-0 items-baseline gap-2">
            <span class="truncate">{item.label}</span>
            {#if item.description}
              <span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">{item.description}</span>
            {/if}
          </span>
          {#if item.detail}
            <span class="truncate text-xs text-muted-foreground">{item.detail}</span>
          {/if}
        </span>
      </Command.Item>
    {/each}
  </Command.List>
  {#if request.canPickMany}
    <div class="flex items-center gap-2 border-t px-2 pt-1">
      <span class="text-xs text-muted-foreground">{count} selected · Ctrl+Enter to confirm</span>
      <div class="ms-auto">
        <Button size="sm" onclick={confirm}>OK</Button>
      </div>
    </div>
  {/if}
</Command.Root>
