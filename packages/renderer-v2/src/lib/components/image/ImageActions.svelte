<script lang="ts">
import type { ImageInfo } from '@desktop-framework/api';

import ResourceActions from '#lib/components/ResourceActions.svelte';

import { imageActions } from './actions.js';

interface Props {
  image: ImageInfo;
  /** an image used by a container cannot be deleted */
  used: boolean;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { image, used, placement = 'row' }: Props = $props();

let set = $derived(imageActions(image, used));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
