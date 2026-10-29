<script lang="ts">
import type { ContainerInfo } from '@desktop-framework/api';

import { getApp } from '#lib/app.svelte.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';

import { containerActions } from './actions.js';

interface Props {
  container: ContainerInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
  /** whether the container has a TTY to attach to (from its inspect data) */
  tty?: boolean;
}

let { container, placement = 'row', tty = false }: Props = $props();

const app = getApp();

let set = $derived(containerActions(container, app, tty));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
