<script lang="ts">
import type { NetworkInspectInfo } from '@desktop-framework/api';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import type { ResourceAction } from '#lib/components/actions.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';

interface Props {
  network: NetworkInspectInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { network, placement = 'row' }: Props = $props();
let used = $derived(Object.keys(network.Containers ?? {}).length > 0);
let actions: ResourceAction[] = $derived([
  {
    label: 'Delete',
    icon: Trash2Icon,
    destructive: true,
    // a network used by a container cannot be deleted
    disabled: used,
    run: (): Promise<void> => window.removeNetwork(network.engineId, network.Id),
  },
]);
</script>

<ResourceActions {actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
