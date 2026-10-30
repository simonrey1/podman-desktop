<script lang="ts">
import ResourceActions from '#lib/components/ResourceActions.svelte';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';

interface Props {
  set: ResourceActionSet;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { set, placement = 'row' }: Props = $props();
</script>

<ResourceActions
  target={set.target}
  actions={set.actions}
  max={placement === 'row' ? 3 : 6}
  size={placement === 'row' ? 'icon-sm' : 'icon'} />
