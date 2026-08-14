<script lang="ts">
import type { OnboardingInfo } from '@podman-desktop/core-api';
import { Button, Checkbox, Link } from '@podman-desktop/ui-svelte';

import { onboardingList } from '/@/stores/onboarding';

import OnboardingExtensionCard from './wizard/OnboardingExtensionCard.svelte';
import OnboardingWizardShell from './wizard/OnboardingWizardShell.svelte';
import OnboardingWizardSteps from './wizard/OnboardingWizardSteps.svelte';

interface OnboardingEntry extends OnboardingInfo {
  checked: boolean;
}

let extensions: OnboardingEntry[] = $state([]);
let initialized = $state(false);

// eslint-disable-next-line svelte/prefer-writable-derived
$effect(() => {
  if (!initialized && $onboardingList.length > 0) {
    extensions = $onboardingList.map(o => ({ ...o, checked: true }));
    initialized = true;
  }
});

const onboardingSteps = $derived(
  extensions.filter(e => e.checked).map(e => ({ label: `${e.displayName} setup`, status: 'upcoming' as const })),
);

let telemetry = $state(true);
</script>

<div class="h-full w-full overflow-hidden">
  <OnboardingWizardShell>
    {#snippet leftSidebar()}
      <OnboardingWizardSteps steps={onboardingSteps} />
    {/snippet}

    {#snippet leftSidebarFooter()}
      <div class="space-y-2">
        <div class="flex items-start gap-2">
          <Checkbox checked={telemetry} title="Enable telemetry" onclick={(): void => { telemetry = !telemetry; }} />
          <div>
            <div class="text-sm font-medium text-(--pd-content-header)">Telemetry</div>
            <p class="text-xs leading-relaxed text-(--pd-content-card-text)">
              Help us improve Podman Desktop by allowing anonymous usage data to be collected.
              <Link>Read our privacy statement.</Link>
            </p>
          </div>
        </div>
      </div>
    {/snippet}

    {#snippet rightContent()}
      <div class="flex max-w-3xl flex-col items-start gap-2">
        <h1 class="text-4xl font-semibold leading-tight text-(--pd-content-header)">
          Welcome to Podman Desktop v1.25!
        </h1>
        <p class="text-sm text-(--pd-content-card-text)">
          Setup everything you need for seamless experience with containers and Kubernetes.
          These configuration selections can be changed later in Settings.
        </p>

        <div class="mt-4 w-full space-y-3">
          <div class="text-sm text-(--pd-content-card-text)">Choose the extensions to include:</div>
          {#each extensions as ext, i (ext.extension)}
            <OnboardingExtensionCard
              icon={ext.icon}
              displayName={ext.displayName}
              description={ext.description}
              bind:checked={extensions[i].checked}
              onToggle={(c: boolean): void => { extensions[i].checked = c; }} />
          {/each}
        </div>
      </div>
    {/snippet}

    {#snippet footer()}
      <div class="flex items-center justify-between">
        <div></div>
        <div class="flex items-center gap-4">
          <button type="button" class="text-sm font-semibold text-(--pd-button-primary-bg)">Skip entire setup</button>
          <Button>Start setup</Button>
        </div>
      </div>
    {/snippet}
  </OnboardingWizardShell>
</div>
