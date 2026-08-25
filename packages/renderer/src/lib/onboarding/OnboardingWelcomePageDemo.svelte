<script lang="ts">
import { Button } from '@podman-desktop/ui-svelte';
import { router } from 'tinro';

import { onboardingList } from '/@/stores/onboarding';

import OnboardingWelcomePage from './OnboardingWelcomePage.svelte';
import OnboardingWelcomeTelemetry from './OnboardingWelcomeTelemetry.svelte';
import OnboardingWizardShell from './wizard/OnboardingWizardShell.svelte';
import type { OnboardingWizardStep } from './wizard/OnboardingWizardSteps.constants';
import OnboardingWizardSteps from './wizard/OnboardingWizardSteps.svelte';

let selections: Record<string, boolean> = $state({});
let welcomePage: OnboardingWelcomePage;

const steps: OnboardingWizardStep[] = $derived([
  { label: 'Get started', status: 'active' },
  ...$onboardingList
    .filter(o => selections[o.extension] ?? true)
    .map(o => ({ label: `${o.displayName} setup`, status: 'upcoming' as const })),
]);

function handleExtensionToggle(extensionId: string, checked: boolean): void {
  selections[extensionId] = checked;
}

function handleStart(): void {
  const ids = welcomePage.getSelectedExtensionIds();
  router.goto(`/global-onboarding?ids=${encodeURIComponent(ids.join(','))}`);
}

function handleSkip(): void {
  router.goto('/');
}
</script>

<div class="h-full w-full overflow-hidden">
  <OnboardingWizardShell>
    {#snippet leftSidebar()}
      <OnboardingWizardSteps {steps} />
    {/snippet}

    {#snippet leftSidebarFooter()}
      <OnboardingWelcomeTelemetry />
    {/snippet}

    {#snippet rightContent()}
      <OnboardingWelcomePage bind:this={welcomePage} onExtensionToggle={handleExtensionToggle} />
    {/snippet}

    {#snippet footer()}
      <div class="flex items-center justify-end gap-4">
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
    {/snippet}
  </OnboardingWizardShell>
</div>
