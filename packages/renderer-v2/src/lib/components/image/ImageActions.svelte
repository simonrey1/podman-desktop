<script lang="ts">
import type { ImageInfo } from '@desktop-framework/api';

import { getApp } from '#lib/app.svelte.js';
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

const app = getApp();

let set = $derived(imageActions(image, used, app));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
