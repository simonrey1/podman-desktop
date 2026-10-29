<script lang="ts" generics="T extends string">
import * as Select from '#lib/components/ui/select/index.js';

interface Props {
  /** bindable: the value chosen */
  value: T;
  options: readonly { value: T; label: string }[];
  id?: string;
  disabled?: boolean;
  /** the accessible name, without a label element */
  'aria-label'?: string;
  /** shown while no option has the value */
  placeholder?: string;
  /** after a choice, e.g. to write it */
  onValueChange?: (value: T) => void;
}

// one value among options, in a menu of the theme (the menu of a native select is drawn by the system)
let {
  value = $bindable(),
  options,
  id,
  disabled,
  'aria-label': ariaLabel,
  placeholder = '',
  onValueChange,
}: Props = $props();

// an empty value is an option of its own (e.g. "The default of the engine"): the menu has no empty value
const EMPTY = '\u0000';

let label = $derived(options.find(option => option.value === value)?.label ?? placeholder);
</script>

<Select.Root
  type="single"
  {disabled}
  bind:value={(): string => value || EMPTY, (selected: string): void => {
    value = (selected === EMPTY ? '' : selected) as T;
    onValueChange?.(value);
  }}>
  <Select.Trigger {id} aria-label={ariaLabel}>
    <span class={['truncate', !options.some(option => option.value === value) && 'text-muted-foreground']}>{label}</span>
  </Select.Trigger>
  <Select.Content>
    {#each options as option (option.value)}
      <Select.Item value={option.value || EMPTY} label={option.label}>{option.label}</Select.Item>
    {/each}
  </Select.Content>
</Select.Root>
