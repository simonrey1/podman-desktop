<script lang="ts">
import type { SecretInfo } from '@desktop-framework/api';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';

import { getApp } from '#lib/app.svelte.js';
import ResourceList from '#lib/components/ResourceList.svelte';
import { secretActions } from '#lib/components/secret/actions.js';
import CreateSecretDialog from '#lib/components/secret/CreateSecretDialog.svelte';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { secretColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

function open(secret: SecretInfo, options: { preview: boolean }): void {
  view.open(viewRef('secret-details', { engineId: secret.engineId, secretId: secret.Id }), options);
}
</script>

<ResourceList
  engineId={view.params.engineId}
  bind:filter={view.state.filter}
  bind:sort={view.state.sort}
  bind:selection={view.state.selection}
  actionsOf={(secret): ResourceActionSet => secretActions(secret)}
  bulk={['Delete']}
  onCreate={(): void => app.modals.open(CreateSecretDialog, { engineId: view.params.engineId })}
  icon={KeyRoundIcon}
  title="Secrets"
  noun="secrets"
  data={app.secrets.ofEngine(view.params.engineId)}
  columns={secretColumns}
  getRowId={(secret): string => secret.Id}
  onOpen={open}
  loaded={app.secrets.loaded} />
