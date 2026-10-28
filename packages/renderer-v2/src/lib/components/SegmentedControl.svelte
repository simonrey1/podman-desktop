<script lang="ts" generics="T extends string">
import * as ToggleGroup from '#lib/components/ui/toggle-group/index.js';

interface Props {
  value: T;
  options: { value: T; label: string }[];
  label: string;
}

// one choice among a few (e.g. a list filter): 28px high, like the buttons and the inputs
let { value = $bindable(), options, label }: Props = $props();
</script>

<div class="flex h-7 items-center rounded-md bg-muted p-0.5">
  <ToggleGroup.Root
    type="single"
    size="sm"
    spacing={0.5}
    aria-label={label}
    bind:value={(): T => value, (selected: string): void => {
      // a single toggle group can be emptied: keep the current choice instead
      if (selected) {
        value = selected as T;
      }
    }}>
    {#each options as option (option.value)}
      <ToggleGroup.Item value={option.value}>{option.label}</ToggleGroup.Item>
    {/each}
  </ToggleGroup.Root>
</div>
