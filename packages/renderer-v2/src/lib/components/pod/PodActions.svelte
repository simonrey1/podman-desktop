<script lang="ts">
import type { PodInfo } from '@desktop-framework/api';

import ResourceActions from '#lib/components/ResourceActions.svelte';

import { podActions } from './actions.js';

interface Props {
  pod: PodInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { pod, placement = 'row' }: Props = $props();

let set = $derived(podActions(pod));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
