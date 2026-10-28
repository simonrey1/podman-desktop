<script lang="ts">
import type { PodInfo } from '@desktop-framework/api';

import { getApp } from '#lib/app.svelte.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';

import { podActions } from './actions.js';

interface Props {
  pod: PodInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { pod, placement = 'row' }: Props = $props();

const app = getApp();

let set = $derived(podActions(pod, app));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
