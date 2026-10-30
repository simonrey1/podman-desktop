<script lang="ts">
import type { SecretInfo } from '@desktop-framework/api';

import { getApp } from '#lib/app.svelte.js';
import ResourceActions from '#lib/components/ResourceActions.svelte';

import { secretActions } from './actions.js';

interface Props {
  secret: SecretInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { secret, placement = 'row' }: Props = $props();

let set = $derived(secretActions(secret, getApp()));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
