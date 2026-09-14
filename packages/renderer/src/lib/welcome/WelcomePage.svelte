<script lang="ts">
import type { WelcomeMessages } from '@podman-desktop/core-api';
import { Button } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { router } from 'tinro';

import DesktopIcon from '/@/lib/images/DesktopIcon.svelte';
import OnboardingWelcomeTelemetry from '/@/lib/onboarding/OnboardingWelcomeTelemetry.svelte';
import OnboardingExtensionCard from '/@/lib/onboarding/wizard/OnboardingExtensionCard.svelte';
import OnboardingWizardShell from '/@/lib/onboarding/wizard/OnboardingWizardShell.svelte';
import { onboardingList } from '/@/stores/onboarding';
import { providerInfos } from '/@/stores/providers';

import type { OnboardingInfoWithAdditionalInfo } from './welcome-utils';
import { WelcomeUtils } from './welcome-utils';

interface Props {
  showWelcome?: boolean;
}

let { showWelcome = false }: Props = $props();

const welcomeUtils = new WelcomeUtils();
let podmanDesktopVersion = $state<string>();

let welcomeMessages = $state<WelcomeMessages>();

// User selection is kept outside of the derived value below: the derived is recomputed on every
// onboardingList/providerInfos emission (a provider status change or an extension starting is
// enough), which would otherwise discard whatever the user checked or unchecked
const selectionOverrides = new SvelteMap<string, boolean>();

let onboardingProviders: OnboardingInfoWithAdditionalInfo[] = $derived(
  welcomeUtils
    .getSortedOnboardingExtensions($onboardingList, $providerInfos)
    .map(provider => ({ ...provider, selected: selectionOverrides.get(provider.name) ?? provider.selected })),
);

onMount(async () => {
  const result = await welcomeUtils.enforceFirstRun();
  podmanDesktopVersion = result.version;
  showWelcome = result.firstRun;
  router.goto('/');
  welcomeMessages = await window.getWelcomeMessages();
});

async function closeWelcome(): Promise<void> {
  showWelcome = false;
}

// Function to toggle provider selection
function toggleOnboardingSelection(providerName: string): void {
  const current = onboardingProviders.find(provider => provider.name === providerName)?.selected ?? true;
  selectionOverrides.set(providerName, !current);
}

function startOnboardingQueue(): void {
  const selectedProviders = onboardingProviders.filter(provider => provider.selected);
  const extensionIds = selectedProviders.map(provider => provider.extension);
  const queryParams = new URLSearchParams({ ids: extensionIds.join(',') }).toString();
  router.goto(`/global-onboarding?${queryParams}`);
}
</script>

{#if showWelcome}
  <div class="fixed inset-0 z-50">
    <OnboardingWizardShell>
      {#snippet leftSidebar()}
        <nav aria-label="Setup steps">
          <ol class="space-y-3">
            {#each onboardingProviders.filter(o => o.selected) as provider (provider.name)}
              <li class="flex items-center gap-3">
                <span class="text-sm text-[var(--pd-content-sub-header)]">{provider.displayName} setup</span>
              </li>
            {/each}
          </ol>
        </nav>
      {/snippet}

      {#snippet leftSidebarFooter()}
        <OnboardingWelcomeTelemetry />
      {/snippet}

      {#snippet rightContent()}
        <div class="flex flex-col items-center gap-6 pt-4">
          <DesktopIcon />
          <div class="text-center">
            <h1 class="text-2xl font-bold text-[var(--pd-content-header)]">
              {welcomeMessages?.welcomeMessage ?? 'Welcome to Podman Desktop'} v{podmanDesktopVersion}!
            </h1>
            <p class="mt-2 text-sm text-[var(--pd-content-card-text)]">
              Setup everything you need for seamless experience with containers and Kubernetes.
              These configuration selections can be changed later in Settings.
            </p>
          </div>

          {#if onboardingProviders && onboardingProviders.length > 0}
            <div aria-label="providerList" class="flex w-full max-w-lg flex-col gap-3">
              {#each onboardingProviders as onboarding, index (index)}
                <OnboardingExtensionCard
                  icon={onboarding.icon}
                  displayName={onboarding.displayName}
                  description={onboarding.description}
                  checked={onboarding.selected ?? true}
                  onToggle={(): void => toggleOnboardingSelection(onboarding.name)} />
              {/each}
            </div>
          {/if}
        </div>
      {/snippet}

      {#snippet footer()}
        <div class="flex justify-end gap-3">
          {#if onboardingProviders && onboardingProviders.filter(o => o.selected).length > 0}
            <Button
              type="link"
              on:click={closeWelcome}>Skip entire setup</Button>
            <Button
              on:click={async (): Promise<void> => {
                await closeWelcome();
                startOnboardingQueue();
              }}>Start setup</Button>
          {:else}
            <Button
              on:click={closeWelcome}>Skip</Button>
          {/if}
        </div>
      {/snippet}
    </OnboardingWizardShell>
  </div>
{/if}
