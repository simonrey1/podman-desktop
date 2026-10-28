<script lang="ts">
import type { VolumeInfo } from '@desktop-framework/api';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import ResourceActions from '#lib/components/ResourceActions.svelte';
import type { ActionTarget, ResourceAction } from '#lib/stores/actions.svelte.js';

interface Props {
  volume: VolumeInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { volume, placement = 'row' }: Props = $props();
let used = $derived(!!volume.containersUsage?.length);
let target: ActionTarget = $derived({ key: `volume:${volume.engineId}:${volume.Name}`, name: volume.Name });

let actions: ResourceAction[] = $derived([
  {
    label: 'Delete',
    icon: Trash2Icon,
    destructive: true,
    // a volume used by a container cannot be deleted
    disabled: used,
    run: (): Promise<void> => window.removeVolume(volume.engineId, volume.Name),
  },
]);
</script>

<ResourceActions {target} {actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
