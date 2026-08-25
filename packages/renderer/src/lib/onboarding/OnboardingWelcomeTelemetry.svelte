<script lang="ts">
import type { TelemetryMessages } from '@podman-desktop/core-api';
import { Checkbox, Link } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';

import { WelcomeUtils } from '/@/lib/welcome/welcome-utils';

const welcomeUtils = new WelcomeUtils();
let telemetry = $state(true);
let showTelemetry = $state(false);
let telemetryMessages: TelemetryMessages | undefined = $state(undefined);

onMount(async () => {
  const alreadyPrompted = await welcomeUtils.havePromptedForTelemetry();
  if (!alreadyPrompted) {
    telemetryMessages = await window.getTelemetryMessages();
    showTelemetry = true;
    await welcomeUtils.setTelemetry(telemetry);
  }
});

async function toggleTelemetry(): Promise<void> {
  telemetry = !telemetry;
  await welcomeUtils.setTelemetry(telemetry);
}
</script>

{#if showTelemetry}
  <div class="flex items-start gap-2">
    <Checkbox
      id="onboarding-telemetry"
      checked={telemetry}
      title="Telemetry"
      onclick={toggleTelemetry} />
    <div>
      <label for="onboarding-telemetry" class="text-sm font-medium text-(--pd-content-header) cursor-pointer">Telemetry</label>
      <p class="text-xs leading-relaxed text-(--pd-content-card-text)">
        {#if telemetryMessages}
          {telemetryMessages.acceptMessage}
          {#if telemetryMessages.info}
            <Link
              onclick={async (): Promise<void> => { await window.openExternal(telemetryMessages?.info?.url ?? ''); }}>
              {telemetryMessages.info.link}
            </Link>
          {/if}
        {:else}
          Help us improve Podman Desktop by allowing anonymous usage data to be collected.
        {/if}
      </p>
    </div>
  </div>
{/if}
