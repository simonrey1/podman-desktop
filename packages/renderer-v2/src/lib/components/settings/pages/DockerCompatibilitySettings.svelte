<script lang="ts">
import type { DockerSocketMappingStatusInfo } from '@desktop-framework/api';
import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import Card from '#lib/components/Card.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import StatusDot from '#lib/components/StatusDot.svelte';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';

// the Docker socket of the system: the engine answering the tools made for Docker (docker, compose, IDE plugins)
const app = getApp();

const ENGINE_NAMES = { podman: 'Podman', docker: 'Docker', unknown: 'An engine not known' };

let status: DockerSocketMappingStatusInfo | undefined = $state.raw();
let loading = $state(false);
let error: string | undefined = $state();

let socket = $derived(app.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock');

async function refresh(): Promise<void> {
  loading = true;
  error = undefined;
  try {
    status = await window.getSystemDockerSocketMappingStatus();
  } catch (err: unknown) {
    error = errorMessage(err);
  } finally {
    loading = false;
  }
}
refresh().catch(console.error);

let rows: KeyValue[] = $derived(
  status
    ? [
        { label: 'Socket', value: socket, mono: true },
        {
          label: 'Answered by',
          value:
            status.connectionInfo?.displayName ??
            (status.serverInfo ? ENGINE_NAMES[status.serverInfo.type] : 'Nothing'),
        },
        ...(status.serverInfo
          ? [
              { label: 'Version', value: status.serverInfo.serverVersion },
              { label: 'System', value: `${status.serverInfo.operatingSystem} (${status.serverInfo.architecture})` },
            ]
          : []),
      ]
    : [],
);
</script>

<Card title="Docker socket">
  <div class="flex items-center gap-2">
    {#if loading}
      <Spinner />
    {:else if status}
      <StatusDot status={status.status === 'running' ? 'running' : 'stopped'} decorative />
      <span class="flex-1">
        {status.status === 'running'
          ? 'The tools made for Docker reach an engine through the socket.'
          : 'No engine answers on the socket: the tools made for Docker do not reach one.'}
      </span>
    {/if}
    <ActionButton
      icon={RefreshCwIcon}
      label="Check again"
      onclick={(): void => {
        refresh().catch(console.error);
      }} />
  </div>
  {#if error}
    <p class="text-destructive">{error}</p>
  {/if}
</Card>
{#if status?.status === 'running'}
  <KeyValueCard title="Engine" {rows} />
{/if}
