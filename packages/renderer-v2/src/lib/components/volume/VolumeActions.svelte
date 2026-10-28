<script lang="ts">
import type { VolumeInfo } from '@desktop-framework/api';

import ResourceActions from '#lib/components/ResourceActions.svelte';

import { volumeActions } from './actions.js';

interface Props {
  volume: VolumeInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { volume, placement = 'row' }: Props = $props();

let set = $derived(volumeActions(volume));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
