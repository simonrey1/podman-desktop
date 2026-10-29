<script lang="ts">
import type { PlayKubeInfo } from '@desktop-framework/api/libpod';
import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
import CircleXIcon from '@lucide/svelte/icons/circle-x';
import FileCodeIcon from '@lucide/svelte/icons/file-code';
import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
import PencilLineIcon from '@lucide/svelte/icons/pencil-line';
import PlayIcon from '@lucide/svelte/icons/play';

import { getApp } from '#lib/app.svelte.js';
import Card from '#lib/components/Card.svelte';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import Page from '#lib/components/Page.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import { Checkbox } from '#lib/components/ui/checkbox/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import * as InputGroup from '#lib/components/ui/input-group/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { shortId } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// creates the pods, containers, volumes and secrets of a Kubernetes YAML with Podman (podman kube play): the form keeps
// its values after it, a failure loses nothing
const app = getApp();

let engine = $derived(app.engines.get(view.params.engineId));

const SOURCES = [
  { value: 'file', label: 'From a file', description: 'A YAML file on this computer.', icon: FolderOpenIcon },
  { value: 'content', label: 'Write the YAML', description: 'Typed or pasted in an editor.', icon: PencilLineIcon },
] as const;

let source: (typeof SOURCES)[number]['value'] = $state('file');
let path = $state('');
let content = $state('');
let build = $state(false);
let replace = $state(false);
let result:
  | { status: 'playing'; tokenId: number }
  | { status: 'played'; info: PlayKubeInfo }
  | { status: 'failed'; error: string }
  | { status: 'canceled' }
  | undefined = $state();

let playing = $derived(result?.status === 'playing');
let valid = $derived(source === 'file' ? !!path.trim() : !!content.trim());
// the pods created with containers not started
let failedPods = $derived(
  result?.status === 'played' ? result.info.Pods.filter(pod => pod.ContainerErrors?.length) : [],
);

async function choose(): Promise<void> {
  const [chosen] =
    (await window.openDialog({
      title: 'Choose a Kubernetes YAML file',
      selectors: ['openFile'],
      filters: [{ name: 'YAML files', extensions: ['yaml', 'yml'] }],
    })) ?? [];
  if (chosen) {
    path = chosen;
  }
}

async function play(): Promise<void> {
  const connection = engine?.connection;
  if (!connection || !valid || playing) {
    return;
  }
  const tokenId = await window.getCancellableTokenSource();
  result = { status: 'playing', tokenId };
  // a canceled play is not reported when it ends
  const stillPlaying = (): boolean => result?.status === 'playing' && result.tokenId === tokenId;
  try {
    const info = await window.playKube(
      source === 'file' ? { type: 'path', value: path.trim() } : { type: 'content', value: content },
      $state.snapshot(connection),
      { build, replace, cancellableTokenId: tokenId },
    );
    if (stillPlaying()) {
      result = { status: 'played', info };
    }
  } catch (error: unknown) {
    if (stillPlaying()) {
      result = { status: 'failed', error: errorMessage(error) };
    }
  }
}

async function cancel(): Promise<void> {
  if (result?.status === 'playing') {
    const { tokenId } = result;
    result = { status: 'canceled' };
    await window.cancelToken(tokenId);
  }
}

function openPod(podId: string): void {
  view.open(viewRef('pod-details', { engineId: view.params.engineId, podId }));
}

function podLabel(podId: string): string {
  return app.pods.get(view.params.engineId, podId)?.Name ?? shortId(podId);
}
</script>

<Page icon={FileCodeIcon} title="Play Kubernetes YAML">
  {#snippet meta()}
    <EngineBadge engineId={view.params.engineId} />
  {/snippet}
  {#snippet actions()}
    {#if playing}
      <Button
        variant="outline"
        onclick={(): void => {
          cancel().catch(console.error);
        }}>
        <CircleStopIcon data-icon="inline-start" />
        Cancel
      </Button>
    {/if}
    <Button
      disabled={!valid || playing || !engine}
      onclick={(): void => {
        play().catch(console.error);
      }}>
      {#if playing}
        <Spinner data-icon="inline-start" />
        Playing
      {:else}
        <PlayIcon data-icon="inline-start" />
        Play
      {/if}
    </Button>
  {/snippet}
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    {#if result}
      <!-- the last play of this form -->
      <div class="flex flex-col gap-2 rounded-lg border px-4 py-2.5" role="status">
        <div class="flex items-center gap-2">
          {#if result.status === 'playing'}
            <Spinner />
            <span class="flex-1">Playing the YAML{build ? ', building its images' : ''}…</span>
          {:else if result.status === 'played'}
            {#if failedPods.length}
              <CircleAlertIcon class="size-4 text-state-warning" />
            {:else}
              <CircleCheckIcon class="size-4 text-state-success" />
            {/if}
            <span class="flex-1">
              Played: {result.info.Pods.length} pod{result.info.Pods.length === 1 ? '' : 's'}
              {#if failedPods.length}, {failedPods.length} with containers not started{/if}.
            </span>
          {:else if result.status === 'failed'}
            <CircleXIcon class="size-4 text-destructive" />
            <span class="min-w-0 flex-1 truncate text-destructive" title={result.error}>The play failed: {result.error}</span>
          {:else}
            <CircleStopIcon class="size-4 text-muted-foreground" />
            <span class="flex-1">The play was canceled.</span>
          {/if}
        </div>
        {#if result.status === 'played' && result.info.Pods.length}
          <ul class="flex flex-col gap-1">
            {#each result.info.Pods as pod (pod.Id)}
              <li class="flex items-center gap-2">
                <span class="min-w-0 flex-1 truncate">
                  {podLabel(pod.Id)}
                  <span class="text-muted-foreground">
                    {pod.Containers?.length ?? 0} container{pod.Containers?.length === 1 ? '' : 's'}
                  </span>
                </span>
                <Button variant="outline" size="sm" onclick={(): void => openPod(pod.Id)}>Open the pod</Button>
              </li>
              {#each pod.ContainerErrors ?? [] as error, index (index)}
                <li class="truncate text-destructive" title={error}>{error}</li>
              {/each}
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
    <Card title="YAML">
      <!-- where the YAML comes from: two choices, the one chosen highlighted -->
      <div class="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Source of the YAML">
        {#each SOURCES as option (option.value)}
          {@const Icon = option.icon}
          <label
            class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-1 has-focus-visible:ring-ring">
            <input type="radio" class="sr-only" name="kube-play-source" value={option.value} bind:group={source} />
            <Icon class={['mt-0.5 size-4 shrink-0', source === option.value ? 'text-primary' : 'text-muted-foreground']} />
            <span class="flex flex-col gap-0.5">
              <span class="font-medium">{option.label}</span>
              <span class="text-sm text-muted-foreground">{option.description}</span>
            </span>
          </label>
        {/each}
      </div>
      {#if source === 'file'}
        <Field.Field>
          <Field.Label for="kube-play-file">File</Field.Label>
          <InputGroup.Root>
            <InputGroup.Input id="kube-play-file" bind:value={path} placeholder="/path/to/pod.yaml" />
            <InputGroup.Addon align="inline-end">
              <InputGroup.Button
                size="xs"
                onclick={(): void => {
                  choose().catch(console.error);
                }}>
                <FolderOpenIcon data-icon="inline-start" />
                Browse
              </InputGroup.Button>
            </InputGroup.Addon>
          </InputGroup.Root>
          <Field.Description>Pods, deployments, persistent volume claims, config maps, secrets.</Field.Description>
        </Field.Field>
      {:else}
        <div class="h-80 overflow-hidden rounded-md border">
          <CodeEditor bind:value={content} language="yaml" readOnly={false} />
        </div>
      {/if}
    </Card>
    <Card title="Options">
      <Field.Group>
        <Field.Field orientation="horizontal">
          <Checkbox id="kube-play-build" bind:checked={build} />
          <Field.Content>
            <Field.Label for="kube-play-build">Build the images</Field.Label>
            <Field.Description>The images with a Containerfile in a directory of their name, next to the file.</Field.Description>
          </Field.Content>
        </Field.Field>
        <Field.Field orientation="horizontal">
          <Checkbox id="kube-play-replace" bind:checked={replace} />
          <Field.Content>
            <Field.Label for="kube-play-replace">Replace</Field.Label>
            <Field.Description>The pods and containers already created by this YAML are deleted first.</Field.Description>
          </Field.Content>
        </Field.Field>
      </Field.Group>
    </Card>
  </div>
</Page>
