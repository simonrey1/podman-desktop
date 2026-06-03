<script lang="ts">
import { Checkbox, Dropdown } from '@podman-desktop/ui-svelte';
import { onMount } from 'svelte';

import { context } from '/@/stores/context';

interface Props {
  extensionId: string;
}

type SetupMode = 'recommended' | 'advanced';

const engineOptions = [{ label: 'podman', value: 'podman' }];

let { extensionId }: Props = $props();

let setupMode: SetupMode = $state('recommended');
let selectedEngine = $state('podman');
let installKubectl = $state(true);
let installCompose = $state(true);
let podmanDesktopVersion = $state('');

function setOnboardingContext(key: string, value: unknown): void {
  const fullyQualifiedKey = `${extensionId}.onboarding.${key}`;
  context.update(ctx => {
    ctx.setValue(fullyQualifiedKey, value);
    return ctx;
  });
}

function syncSelectionInContext(): void {
  setOnboardingContext('setupMode', setupMode);
  setOnboardingContext('setupModeRecommended', setupMode === 'recommended');
  setOnboardingContext('setupModeAdvanced', setupMode === 'advanced');
  setOnboardingContext('selectedContainerEngine', selectedEngine);
  setOnboardingContext('installKubectl', installKubectl);
  setOnboardingContext('installCompose', installCompose);
}

function selectSetupMode(mode: SetupMode): void {
  setupMode = mode;
  syncSelectionInContext();
}

onMount(async () => {
  podmanDesktopVersion = await window.getPodmanDesktopVersion();
  syncSelectionInContext();
});
</script>

<div class="mx-auto w-full max-w-3xl space-y-6" aria-label="Welcome setup mode selection">
  <div class="space-y-2">
    <h1 class="text-3xl font-semibold text-(--pd-content-header)">Welcome to Podman Desktop v{podmanDesktopVersion}!</h1>
    <p class="text-sm text-(--pd-content-card-text)">
      Setup everything you need for seamless experience with containers and Kubernetes.
    </p>
  </div>

  <div class="space-y-3 rounded-lg border border-(--pd-content-card-border) bg-(--pd-content-card-bg) p-4">
    <label class="flex cursor-pointer items-start gap-3">
      <input
        type="radio"
        name="setup-mode"
        checked={setupMode === 'recommended'}
        onchange={(): void => selectSetupMode('recommended')}
        aria-label="Use recommended setup" />
      <div class="space-y-1">
        <div class="text-sm font-semibold text-(--pd-content-header)">Use recommended setup</div>
        <div class="text-xs text-(--pd-content-card-text)">
          This will install Podman, create a machine, and set up CLI tools.
        </div>
      </div>
    </label>

    <label class="flex cursor-pointer items-start gap-3">
      <input
        type="radio"
        name="setup-mode"
        checked={setupMode === 'advanced'}
        onchange={(): void => selectSetupMode('advanced')}
        aria-label="Use advanced setup" />
      <div class="space-y-1">
        <div class="text-sm font-semibold text-(--pd-content-header)">Use advanced setup</div>
        <div class="text-xs text-(--pd-content-card-text)">
          Choose your container engine and additional CLI tools.
        </div>
      </div>
    </label>
  </div>

  {#if setupMode === 'advanced'}
    <div class="space-y-4 rounded-lg border border-(--pd-content-card-border) bg-(--pd-content-card-bg) p-4">
      <div class="space-y-2">
        <div class="text-sm font-semibold text-(--pd-content-header)">Container engine</div>
        <div class="max-w-xs">
          <Dropdown
            ariaLabel="Container engine"
            value={selectedEngine}
            onChange={(value: string): void => {
              selectedEngine = value;
              syncSelectionInContext();
            }}
            options={engineOptions}>
          </Dropdown>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-sm font-semibold text-(--pd-content-header)">Tools</div>
        <div class="space-y-2">
          <Checkbox bind:checked={installKubectl} title="kubectl" on:click={syncSelectionInContext}>
            <div class="inline-flex flex-wrap items-baseline gap-1">
              <span class="text-sm text-(--pd-content-header)">kubectl</span>
              <span class="text-xs text-(--pd-content-card-text)">Install Kubernetes command-line tooling.</span>
            </div>
          </Checkbox>
          <Checkbox bind:checked={installCompose} title="compose" on:click={syncSelectionInContext}>
            <div class="inline-flex flex-wrap items-baseline gap-1">
              <span class="text-sm text-(--pd-content-header)">compose</span>
              <span class="text-xs text-(--pd-content-card-text)">Install Compose support for local workflows.</span>
            </div>
          </Checkbox>
        </div>
      </div>
    </div>
  {/if}
</div>
