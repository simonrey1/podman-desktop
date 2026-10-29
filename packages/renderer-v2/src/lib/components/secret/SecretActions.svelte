<script lang="ts">
import type { SecretInfo } from '@desktop-framework/api';

import ResourceActions from '#lib/components/ResourceActions.svelte';

import { secretActions } from './actions.js';

interface Props {
  secret: SecretInfo;
  /** row: 3 buttons at most, header: 6 */
  placement?: 'row' | 'header';
}

let { secret, placement = 'row' }: Props = $props();

let set = $derived(secretActions(secret));
</script>

<ResourceActions target={set.target} actions={set.actions} max={placement === 'row' ? 3 : 6} size={placement === 'row' ? 'icon-sm' : 'icon'} />
