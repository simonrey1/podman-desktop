<script lang="ts">
import type { TelemetryMessages } from '@podman-desktop/core-api';
import { Button, Checkbox, Link } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';

import { WelcomeUtils } from '/@/lib/welcome/welcome-utils';
import { onboardingList } from '/@/stores/onboarding';

import OnboardingExtensionCard from './wizard/OnboardingExtensionCard.svelte';
import OnboardingWizardShell from './wizard/OnboardingWizardShell.svelte';
import OnboardingWizardSteps from './wizard/OnboardingWizardSteps.svelte';

interface Props {
  extensionSelections: Record<string, boolean>;
  onSkip: () => void;
  onStart: () => void;
}

let { extensionSelections = $bindable(), onSkip, onStart }: Props = $props();

const extensions = $derived($onboardingList.map(o => ({ ...o, checked: extensionSelections[o.extension] ?? true })));

const onboardingSteps = $derived(
  extensions.filter(e => e.checked).map(e => ({ label: `${e.displayName} setup`, status: 'upcoming' as const })),
);

const welcomeUtils = new WelcomeUtils();
let telemetry = $state(true);
let showTelemetry = $state(false);
let telemetryMessages: TelemetryMessages | undefined = $state(undefined);

onMount(async () => {
  const alreadyPrompted = await welcomeUtils.havePromptedForTelemetry();
  if (!alreadyPrompted) {
    telemetryMessages = await window.getTelemetryMessages();
    showTelemetry = true;
  }
});

async function handleSkip(): Promise<void> {
  if (showTelemetry) {
    await welcomeUtils.setTelemetry(telemetry);
  }
  onSkip();
}

async function handleStart(): Promise<void> {
  if (showTelemetry) {
    await welcomeUtils.setTelemetry(telemetry);
  }
  onStart();
}
</script>

<div class="h-full w-full overflow-hidden">
  <OnboardingWizardShell>
    {#snippet leftSidebar()}
      <OnboardingWizardSteps steps={onboardingSteps} />
    {/snippet}

    {#snippet leftSidebarFooter()}
      {#if showTelemetry}
        <div class="space-y-2">
          <div class="flex items-start gap-2">
            <Checkbox
              checked={telemetry}
              title="Enable telemetry"
              onclick={(): void => { telemetry = !telemetry; }} />
            <div>
              <div class="text-sm font-medium text-(--pd-content-header)">Telemetry</div>
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
        </div>
      {/if}
    {/snippet}

    {#snippet rightContent()}
      <div class="flex max-w-3xl flex-col items-start gap-2">
        <h1 class="text-4xl font-semibold leading-tight text-(--pd-content-header)">
          Welcome to Podman Desktop!
        </h1>
        <p class="text-sm text-(--pd-content-card-text)">
          Setup everything you need for seamless experience with containers and Kubernetes.
          These configuration selections can be changed later in Settings.
        </p>

        <div class="mt-4 w-full space-y-3">
          <div class="text-sm text-(--pd-content-card-text)">Choose the extensions to include:</div>
          {#each extensions as ext (ext.extension)}
            <OnboardingExtensionCard
              icon={ext.icon}
              displayName={ext.displayName}
              description={ext.description}
              checked={ext.checked}
              onToggle={(c: boolean): void => { extensionSelections[ext.extension] = c; }} />
          {/each}
        </div>
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="flex items-center justify-end">
        <div class="flex items-center gap-4">
          <button
            type="button"
            class="text-sm font-semibold text-(--pd-button-primary-bg)"
            onclick={handleSkip}>
            Skip entire setup
          </button>
          <Button onclick={handleStart}>
            Start setup
          </Button>
        </div>
      </div>
    {/snippet}
  </OnboardingWizardShell>
</div>
