<script lang="ts">
import { Button, Link } from '@podman-desktop/ui-svelte';

import OnboardingSkipConfirmDialog from './OnboardingSkipConfirmDialog.svelte';
import OnboardingWelcomeSetupMode from './OnboardingWelcomeSetupMode.svelte';
import OnboardingWelcomeTelemetry from './OnboardingWelcomeTelemetry.svelte';
import OnboardingWizardShell from './OnboardingWizardShell.svelte';
import { ONBOARDING_WIZARD_DEFAULT_STEPS } from './OnboardingWizardSteps.constants';
import OnboardingWizardSteps from './OnboardingWizardSteps.svelte';

const extensionId = 'podman';
let showSkipDialog = $state(false);
</script>

<div class="h-full w-full">
  <OnboardingWizardShell containerClass="h-full rounded-none border-0">
    {#snippet leftSidebar()}
      <OnboardingWizardSteps steps={ONBOARDING_WIZARD_DEFAULT_STEPS} markerStyle="numbered" />
    {/snippet}

    {#snippet leftSidebarFooter()}
      <div class="rounded-lg border border-(--pd-content-card-border) bg-(--pd-content-card-inset-bg) p-4">
        <OnboardingWelcomeTelemetry {extensionId} />
      </div>
    {/snippet}

    {#snippet rightContent()}
      <OnboardingWelcomeSetupMode {extensionId} />
    {/snippet}

    {#snippet footer()}
      <div class="flex items-center justify-between">
        <Link onclick={(): void => { showSkipDialog = true; }}>Skip entire setup</Link>
        <Button>Start setup</Button>
      </div>
    {/snippet}
  </OnboardingWizardShell>
</div>

{#if showSkipDialog}
  <OnboardingSkipConfirmDialog
    onclose={(): void => { showSkipDialog = false; }} 
    onskip={(): void => { showSkipDialog = false; }}/>
{/if}
