<script lang="ts">
import { faCircleQuestion } from '@fortawesome/free-regular-svg-icons';
import type { IConfigurationPropertyRecordedSchema } from '@podman-desktop/core-api/configuration';
import { Dropdown, NumberInput } from '@podman-desktop/ui-svelte';
import { Icon } from '@podman-desktop/ui-svelte/icons';

import SliderItem from '/@/lib/preferences/item-formats/SliderItem.svelte';
import SlideToggle from '/@/lib/ui/SlideToggle.svelte';

import OnboardingWizardShell from './wizard/OnboardingWizardShell.svelte';
import OnboardingWizardSteps from './wizard/OnboardingWizardSteps.svelte';

const onboardingSteps: { label: string; status: 'completed' | 'active' | 'upcoming' }[] = [
  { label: '1. Install podman', status: 'completed' },
  { label: '2. Create podman machine', status: 'active' },
  { label: '3. Install CLI tools and extensions', status: 'upcoming' },
];

const cpuRecord: IConfigurationPropertyRecordedSchema = {
  title: 'CPU(s)',
  parentId: 'onboarding-demo',
  id: 'cpu',
  description: 'CPU(s)',
  type: 'integer',
  minimum: 1,
  maximum: 8,
  step: 1,
};

const memoryRecord: IConfigurationPropertyRecordedSchema = {
  title: 'Memory',
  parentId: 'onboarding-demo',
  id: 'memory',
  description: 'Memory',
  type: 'integer',
  minimum: 1,
  maximum: 12,
  step: 1,
};

const diskRecord: IConfigurationPropertyRecordedSchema = {
  title: 'Disk size',
  parentId: 'onboarding-demo',
  id: 'disk',
  description: 'Disk size',
  type: 'integer',
  minimum: 20,
  maximum: 128,
  step: 1,
};

const providerOptions = [
  { label: 'default GPU enabled (LibKrun)', value: 'default GPU enabled (LibKrun)' },
  { label: 'applehv', value: 'applehv' },
];

let cpu = $state(6);
let memory = $state(4);
let diskSize = $state(100);
let providerType = $state('default GPU enabled (LibKrun)');
let rootPrivileges = $state(true);
let startNow = $state(true);

function onSliderChange(id: string, value: number): Promise<void> {
  if (id === 'cpu') {
    cpu = value;
  } else if (id === 'memory') {
    memory = value;
  } else if (id === 'disk') {
    diskSize = value;
  }
  return Promise.resolve();
}
</script>

<div class="h-full w-full overflow-hidden">
  <OnboardingWizardShell containerClass="h-full">
      {#snippet leftSidebar()}
        <OnboardingWizardSteps steps={onboardingSteps} />
      {/snippet}

      {#snippet leftSidebarFooter()}
        <div class="rounded-lg border border-(--pd-content-card-border) bg-(--pd-content-card-inset-bg) px-4 py-3">
          <div class="flex items-center gap-1.5 text-sm font-semibold text-(--pd-content-header)">
            <Icon class="h-3.5 w-3.5" icon={faCircleQuestion} />
            <span>Tip!</span>
          </div>
          <p class="mt-1 text-xs leading-relaxed text-(--pd-content-card-text)">
            Run `podman machine list` to check the status of the new machine.
          </p>
        </div>
      {/snippet}

      {#snippet rightContent()}
        <div class="max-w-3xl space-y-8">
          <h1 class="text-4xl font-semibold leading-tight text-(--pd-content-header)">Create Podman machine</h1>

          <div class="space-y-6 text-(--pd-content-header)">
            <div class="space-y-2">
              <div class="text-sm font-semibold">Name:</div>
              <div class="border-b border-(--pd-content-card-border) pb-2 text-sm text-(--pd-content-card-text)">
                podman-machine-default
              </div>
            </div>

            <div class="space-y-2">
              <div class="text-sm font-semibold">CPU(s)</div>
              <div class="flex items-center gap-6">
                <div class="flex-1">
                  <SliderItem record={cpuRecord} value={cpu} onChange={onSliderChange} />
                </div>
                <NumberInput
                  class="w-24"
                  name="cpu-value"
                  type="integer"
                  minimum={1}
                  maximum={8}
                  bind:value={cpu}
                  onValidation={(): void => {}}
                  showError={false}
                  aria-label="CPU value" />
              </div>
              <div class="text-sm text-(--pd-content-card-text)">{cpu} / 8 cores</div>
            </div>

            <div class="space-y-2">
              <div class="text-sm font-semibold">Memory</div>
              <div class="flex items-center gap-6">
                <div class="flex-1">
                  <SliderItem record={memoryRecord} value={memory} onChange={onSliderChange} />
                </div>
                <NumberInput
                  class="w-24"
                  name="memory-value"
                  type="integer"
                  minimum={1}
                  maximum={12}
                  bind:value={memory}
                  onValidation={(): void => {}}
                  showError={false}
                  aria-label="Memory value" />
              </div>
              <div class="text-sm text-(--pd-content-card-text)">{memory} / 12 GB</div>
            </div>

            <div class="space-y-2">
              <div class="text-sm font-semibold">Disk size</div>
              <div class="flex items-center gap-6">
                <div class="flex-1">
                  <SliderItem record={diskRecord} value={diskSize} onChange={onSliderChange} />
                </div>
                <NumberInput
                  class="w-24"
                  name="disk-size-value"
                  type="integer"
                  minimum={20}
                  maximum={128}
                  bind:value={diskSize}
                  onValidation={(): void => {}}
                  showError={false}
                  aria-label="Disk size value" />
              </div>
              <div class="text-sm text-(--pd-content-card-text)">{diskSize} / 128 GB</div>
            </div>

            <div class="flex items-center justify-between border-b border-(--pd-content-card-border) pb-3">
              <span class="text-base">Machine with root privileges</span>
              <SlideToggle id="root-privileges" aria-label="Machine with root privileges" bind:checked={rootPrivileges} />
            </div>

            <div class="flex items-center justify-between border-b border-(--pd-content-card-border) pb-3">
              <span class="text-base">Provider type</span>
              <div class="w-60">
                <Dropdown
                  ariaLabel="Provider type"
                  value={providerType}
                  onChange={(value: string): void => {
                    providerType = value;
                  }}
                  options={providerOptions}>
                </Dropdown>
              </div>
            </div>

            <div class="flex items-center justify-between pb-2">
              <span class="text-base">Start the machine now</span>
              <SlideToggle id="start-now" aria-label="Start the machine now" bind:checked={startNow} />
            </div>
          </div>
        </div>
      {/snippet}

      {#snippet footer()}
        <div class="flex items-center justify-end gap-4">
          <button type="button" class="text-base font-semibold text-(--pd-button-primary-bg)">← Back</button>
          <button
            type="button"
            class="rounded-md border border-(--pd-button-primary-border) bg-(--pd-button-primary-bg) px-6 py-2.5 text-base font-semibold text-(--pd-button-primary-text)">
            Create
          </button>
        </div>
      {/snippet}
  </OnboardingWizardShell>
</div>
