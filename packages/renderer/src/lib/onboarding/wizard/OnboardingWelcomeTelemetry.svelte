<script lang="ts">
import type { TelemetryMessages } from '@podman-desktop/core-api';
import { Checkbox, Link } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';

import { context } from '/@/stores/context';

interface Props {
  extensionId: string;
}

let { extensionId }: Props = $props();

let telemetryEnabled = $state(true);
let telemetryMessages: TelemetryMessages | undefined = $state();

function setTelemetryContextValue(): void {
  const fullyQualifiedKey = `${extensionId}.onboarding.telemetryEnabled`;
  context.update(ctx => {
    ctx.setValue(fullyQualifiedKey, telemetryEnabled);
    return ctx;
  });
}

function openTelemetryPrivacyLink(): Promise<void> {
  return window.openExternal(telemetryMessages?.privacy?.url ?? '');
}

onMount(async () => {
  telemetryMessages = await window.getTelemetryMessages();
  setTelemetryContextValue();
});
</script>

<Checkbox bind:checked={telemetryEnabled} title="Enable telemetry" on:click={setTelemetryContextValue}>
  <div class="space-y-1">
    <div class="text-sm font-medium text-(--pd-content-header)">Telemetry</div>
    <div class="text-xs text-(--pd-content-card-text)">
      {telemetryMessages?.acceptMessage}
      {#if telemetryMessages?.privacy}
        <span> </span>
        <Link on:click={openTelemetryPrivacyLink}>
          {telemetryMessages.privacy.link}
        </Link>
      {/if}
    </div>
  </div>
</Checkbox>
