<script lang="ts">
import type { NetworkInspectInfo } from '@desktop-framework/api';

import ResourceActions from '#lib/components/ResourceActions.svelte';

import { networkActions } from './actions.js';

interface Props {
  network: NetworkInspectInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { network, placement = 'row' }: Props = $props();

let set = $derived(networkActions(network));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
