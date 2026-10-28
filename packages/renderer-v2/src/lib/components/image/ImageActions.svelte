<script lang="ts">
import type { ImageInfo } from '@desktop-framework/api';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import type { ResourceAction } from '#lib/components/actions.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';

interface Props {
  image: ImageInfo;
  /** an image used by a container cannot be deleted */
  used: boolean;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { image, used, placement = 'row' }: Props = $props();

let actions: ResourceAction[] = $derived([
  {
    label: 'Delete',
    icon: Trash2Icon,
    destructive: true,
    // an image used by a container cannot be deleted
    disabled: used,
    run: (): Promise<void> => window.deleteImage(image.engineId, image.Id),
  },
]);
</script>

<ResourceActions {actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
