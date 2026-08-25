<script lang="ts">
import { onMount } from 'svelte';

import { WelcomeUtils } from '/@/lib/welcome/welcome-utils';
import { onboardingList } from '/@/stores/onboarding';
import { providerInfos } from '/@/stores/providers';

import OnboardingExtensionCard from './wizard/OnboardingExtensionCard.svelte';

interface Props {
  onExtensionToggle: (extensionId: string, checked: boolean) => void;
}

let { onExtensionToggle }: Props = $props();

let selections: Record<string, boolean> = $state({});
let podmanDesktopVersion = $state('');

const welcomeUtils = new WelcomeUtils();

const providersWithContainerConnections = $derived(
  $providerInfos.filter(provider => provider.containerConnections.length > 0),
);

const extensions = $derived(
  $onboardingList
    .map(o => {
      const hasContainerConnection = providersWithContainerConnections.some(
        p => p.extensionId === o.extension,
      );
      return { ...o, checked: selections[o.extension] ?? true, containerEngine: hasContainerConnection };
    })
    .toSorted((a, b) => Number(b.containerEngine) - Number(a.containerEngine)),
);

export function getSelectedExtensionIds(): string[] {
  return extensions.filter(e => e.checked).map(e => e.extension);
}

function toggleExtensionSelection(extensionId: string, checked: boolean): void {
  selections[extensionId] = checked;
  onExtensionToggle(extensionId, checked);
}

onMount(async () => {
  podmanDesktopVersion = await window.getPodmanDesktopVersion();

  const ver = await welcomeUtils.getVersion();
  if (!ver) {
    await welcomeUtils.updateVersion('initial');
    await window.updateConfigurationValue('releaseNotesBanner.show', podmanDesktopVersion);
  }
});
</script>

<div class="flex max-w-3xl flex-col items-start gap-2">
  <h1 class="text-4xl font-semibold leading-tight text-(--pd-content-header)">
    Welcome to Podman Desktop{podmanDesktopVersion ? ` v${podmanDesktopVersion}` : ''}!
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
        onToggle={(c: boolean): void => { toggleExtensionSelection(ext.extension, c); }} />
    {/each}
  </div>
</div>
