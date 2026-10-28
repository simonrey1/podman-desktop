<script lang="ts">
import SegmentedControl from '#lib/components/SegmentedControl.svelte';

interface Props {
  /** bindable */
  value: 'all' | 'running' | 'stopped';
}

// in the header of a list: all the resources, the running ones, or the others
let { value = $bindable() }: Props = $props();
</script>

<SegmentedControl
  label="State"
  bind:value
  options={[
    { value: 'all', label: 'All' },
    { value: 'running', label: 'Running' },
    { value: 'stopped', label: 'Stopped' },
  ]} />
