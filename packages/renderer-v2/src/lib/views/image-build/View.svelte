<script lang="ts">
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
import CircleXIcon from '@lucide/svelte/icons/circle-x';
import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
import HammerIcon from '@lucide/svelte/icons/hammer';
import PlusIcon from '@lucide/svelte/icons/plus';
import XIcon from '@lucide/svelte/icons/x';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import Card from '#lib/components/Card.svelte';
import ChoiceSelect from '#lib/components/ChoiceSelect.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import Page from '#lib/components/Page.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import { Checkbox } from '#lib/components/ui/checkbox/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import * as InputGroup from '#lib/components/ui/input-group/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import type { Build } from '#lib/stores/builds.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// builds an image on the engine: the form keeps its values while the build runs and after it (a failed build loses
// nothing), the output of the build is a session of the panel
const app = getApp();

let engine = $derived(app.engines.get(view.params.engineId));

const PLATFORMS = [
  { value: 'linux/amd64', label: 'Intel and AMD x86_64' },
  { value: 'linux/arm64', label: 'ARM aarch64' },
  { value: 'linux/ppc64le', label: 'Power ppc64le' },
  { value: 'linux/s390x', label: 'IBM s390x' },
  { value: 'wasi/wasm', label: 'WebAssembly' },
];

let containerfile = $state('');
let context = $state('');
let imageName = $state('');
let target = $state('');
let buildArgs: { key: string; value: string }[] = $state([]);
// each platform checked or not (a checkbox cannot be bound to undefined)
let platforms: Record<string, boolean> = $state(Object.fromEntries(PLATFORMS.map(platform => [platform.value, false])));
let validateRegistries = $state(true);
let build: Build | undefined = $state();

// the platform of this computer, checked at first
const arch = new AsyncValue<string>(() => window.getOsArch());
$effect(() => {
  if (arch.value && !Object.values(platforms).some(Boolean)) {
    platforms[`linux/${arch.value === 'x64' ? 'amd64' : arch.value}`] = true;
  }
});

// the stages of the Containerfile, to build one of them
const info = new AsyncValue(() => (containerfile ? window.containerfileGetInfo(containerfile) : undefined));
let targets = $derived(info.value?.targets ?? []);

let chosenPlatforms = $derived(Object.keys(platforms).filter(platform => platforms[platform]));
let running = $derived(build?.status === 'running');
// several platforms build a manifest: it needs a name
let valid = $derived(
  !!containerfile && !!context && chosenPlatforms.length > 0 && (chosenPlatforms.length === 1 || !!imageName.trim()),
);

async function chooseContainerfile(): Promise<void> {
  const [path] = (await window.openDialog({ title: 'Choose the Containerfile', selectors: ['openFile'] })) ?? [];
  if (path) {
    containerfile = path;
    // its directory by default
    context ||= path.substring(0, path.lastIndexOf('/')) || '/';
  }
}

async function chooseContext(): Promise<void> {
  const [path] = (await window.openDialog({ title: 'Choose the build context', selectors: ['openDirectory'] })) ?? [];
  if (path) {
    context = path;
  }
}

function start(): void {
  if (!engine || !valid) {
    return;
  }
  build = app.builds.start({
    engineId: view.params.engineId,
    connection: engine.connection,
    containerfile,
    context,
    imageName: imageName.trim(),
    platforms: chosenPlatforms,
    buildArgs: Object.fromEntries(buildArgs.filter(arg => arg.key.trim()).map(arg => [arg.key.trim(), arg.value])),
    target,
    validateRegistries,
  });
  showOutput();
}

function showOutput(): void {
  if (build) {
    app.workbench.open(viewRef('build-output', { buildId: build.id }));
  }
}

function openImage(): void {
  const built = build;
  if (!built?.imageId) {
    return;
  }
  const image = app.images
    .ofEngine(built.request.engineId)
    .find(
      item =>
        item.Id === built.imageId ||
        item.RepoTags?.some(tag => tag === built.imageId || tag.startsWith(`${built.imageId}:`)),
    );
  if (image) {
    view.open(viewRef('image-details', { engineId: image.engineId, imageId: image.Id }));
  }
}
</script>

<Page icon={HammerIcon} title="Build an image">
  {#snippet meta()}
    <EngineBadge engineId={view.params.engineId} />
  {/snippet}
  {#snippet actions()}
    {#if running}
      <Button variant="outline" onclick={(): void => {
        build?.cancel().catch(console.error);
      }}>
        <CircleStopIcon data-icon="inline-start" />
        Cancel
      </Button>
    {/if}
    <Button disabled={!valid || running || !engine} onclick={start}>
      {#if running}
        <Spinner data-icon="inline-start" />
        Building
      {:else}
        <HammerIcon data-icon="inline-start" />
        Build
      {/if}
    </Button>
  {/snippet}
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    {#if build}
      <!-- the last build of this form -->
      <div class="flex items-center gap-2 rounded-lg border px-4 py-2.5" role="status">
        {#if build.status === 'running'}
          <Spinner />
          <span class="flex-1">Building{build.request.imageName ? ` ${build.request.imageName}` : ''}…</span>
        {:else if build.status === 'succeeded'}
          <CircleCheckIcon class="size-4 text-state-success" />
          <span class="flex-1">Built{build.request.imageName ? ` ${build.request.imageName}` : ''}.</span>
          {#if build.imageId}
            <Button variant="outline" size="sm" onclick={openImage}>Open the image</Button>
          {/if}
        {:else if build.status === 'failed'}
          <CircleXIcon class="size-4 text-state-error" />
          <span class="min-w-0 flex-1 truncate text-state-error" title={build.error}>The build failed: {build.error}</span>
        {:else}
          <CircleStopIcon class="size-4 text-muted-foreground" />
          <span class="flex-1">The build was canceled.</span>
        {/if}
        <Button variant="ghost" size="sm" onclick={showOutput}>Output</Button>
      </div>
    {/if}
    <Card title="Containerfile">
      <Field.Group>
        <Field.Field>
          <Field.Label for="build-containerfile">Containerfile</Field.Label>
          <InputGroup.Root>
            <InputGroup.Input id="build-containerfile" bind:value={containerfile} placeholder="/path/to/Containerfile" />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button size="xs" onclick={(): void => void chooseContainerfile().catch(console.error)}>
                <FolderOpenIcon data-icon="inline-start" />
                Browse
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup.Root>
        </Field.Field>
        <Field.Field>
          <Field.Label for="build-context">Build context</Field.Label>
          <InputGroup.Root>
            <InputGroup.Input id="build-context" bind:value={context} placeholder="The directory sent to the engine" />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button size="xs" onclick={(): void => void chooseContext().catch(console.error)}>
                <FolderOpenIcon data-icon="inline-start" />
                Browse
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup.Root>
          <Field.Description>The directory of the Containerfile when not chosen.</Field.Description>
        </Field.Field>
      </Field.Group>
    </Card>
    <Card title="Image">
      <Field.Field>
        <Field.Label for="build-name">Name{chosenPlatforms.length > 1 ? '' : ' (optional)'}</Field.Label>
        <Input id="build-name" bind:value={imageName} placeholder="quay.io/namespace/my-image:latest" />
        {#if chosenPlatforms.length > 1}
          <Field.Description>The name of the manifest of the images of the platforms.</Field.Description>
        {/if}
      </Field.Field>
    </Card>
    <Card title="Options">
      <Field.Group>
        {#if targets.length > 1}
          <Field.Field>
            <Field.Label for="build-target">Stage</Field.Label>
            <ChoiceSelect
              id="build-target"
              bind:value={target}
              options={[{ value: '', label: 'The last one' }, ...targets.map(stage => ({ value: stage, label: stage }))]} />
          </Field.Field>
        {/if}
        <Field.Set>
          <Field.Legend variant="label">Platforms</Field.Legend>
          <div class="grid grid-cols-2 gap-2">
            {#each PLATFORMS as platform (platform.value)}
              <Field.Field orientation="horizontal">
                <Checkbox id="build-{platform.value}" bind:checked={platforms[platform.value]} />
                <Field.Label for="build-{platform.value}">
                  {platform.label}
                  <span class="text-muted-foreground">{platform.value}</span>
                </Field.Label>
              </Field.Field>
            {/each}
          </div>
          {#if chosenPlatforms.length > 1}
            <Field.Description>Several platforms build an image for each, then a manifest of them.</Field.Description>
          {/if}
        </Field.Set>
        <Field.Set>
          <Field.Legend variant="label">Build arguments</Field.Legend>
          {#each buildArgs as arg, index (index)}
            <div class="flex items-center gap-2">
              <Input bind:value={arg.key} placeholder="Name" aria-label="Name of the argument {index + 1}" />
              <Input bind:value={arg.value} placeholder="Value" aria-label="Value of the argument {index + 1}" />
              <ActionButton icon={XIcon} label="Remove the argument" size="icon-xs" onclick={(): unknown => buildArgs.splice(index, 1)} />
            </div>
          {/each}
          <div>
            <Button variant="outline" size="sm" onclick={(): number => buildArgs.push({ key: '', value: '' })}>
              <PlusIcon data-icon="inline-start" />
              Add an argument
            </Button>
          </div>
        </Field.Set>
        <Field.Field orientation="horizontal">
          <Checkbox id="build-validate" bind:checked={validateRegistries} />
          <Field.Label for="build-validate">Validate the registries before building</Field.Label>
        </Field.Field>
      </Field.Group>
    </Card>
  </div>
</Page>
