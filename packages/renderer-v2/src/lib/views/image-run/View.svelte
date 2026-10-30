<script lang="ts">
import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
import CircleXIcon from '@lucide/svelte/icons/circle-x';
import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
import LayersIcon from '@lucide/svelte/icons/layers';
import PlayIcon from '@lucide/svelte/icons/play';
import PlusIcon from '@lucide/svelte/icons/plus';
import XIcon from '@lucide/svelte/icons/x';
import { untrack } from 'svelte';

import { getApp } from '#lib/app.svelte.js';
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
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { containerName, shortId } from '#lib/stores/containers.svelte.js';
import { imageLabel, imageName } from '#lib/stores/images.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { createOptions, joinArguments, portRange, type RunForm } from './options.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const VOLUME_TYPES = [
  { value: 'bind', label: 'Host directory' },
  { value: 'volume', label: 'Volume' },
] as const;
const SECRET_TYPES = [
  { value: 'mount', label: 'File' },
  { value: 'env', label: 'Variable' },
] as const;
const RESTART_POLICIES = [
  { value: '', label: 'The default of the engine' },
  { value: 'no', label: 'Never' },
  { value: 'always', label: 'Always' },
  { value: 'unless-stopped', label: 'Unless stopped by the user' },
  { value: 'on-failure', label: 'When it fails (exit code not 0)' },
] as const;
const NETWORK_MODES = [
  { value: 'bridge', label: 'Bridge' },
  { value: 'network', label: 'A network of the engine' },
  { value: 'container', label: 'The network of a container' },
  { value: 'host', label: 'The network of the host' },
  { value: 'none', label: 'None' },
] as const;

// creates a container of the image, started or not: the form keeps its values after it (a failure loses nothing)
const app = getApp();

let engine = $derived(app.engines.get(view.params.engineId));
let image = $derived(app.images.get(view.params.engineId, view.params.imageId));
// the image by its name, or by its ID without one
let reference = $derived(image && imageName(image) !== '<none>' ? imageName(image) : view.params.imageId);

// the network and the container of the modes are apart: their defaults follow the engine
let form: Omit<RunForm, 'network' | 'container'> = $state({
  name: '',
  entrypoint: '',
  command: '',
  ports: [],
  volumes: [],
  env: [],
  envFiles: [],
  secrets: [],
  tty: true,
  interactive: true,
  user: '',
  autoRemove: false,
  restartPolicy: '',
  retries: 1,
  devices: [],
  hostname: '',
  dns: [],
  extraHosts: [],
  networkMode: 'bridge',
  privileged: false,
  readOnly: false,
  securityOptions: [],
  capAdd: [],
  capDrop: [],
  userns: '',
});
// the ports exposed by the image: their container side is not edited
let exposedPorts: number = $state(0);
// the error of each port of the host, by index in the ports
let portErrors: Record<number, string> = $state({});
let loading = $state(true);
let result:
  | { status: 'creating'; start: boolean }
  | { status: 'created'; start: boolean; id: string }
  | { status: 'failed'; start: boolean; error: string }
  | undefined = $state();

let volumes = $derived(app.volumes.ofEngine(view.params.engineId).toSorted((a, b) => a.Name.localeCompare(b.Name)));
let networks = $derived(app.networks.ofEngine(view.params.engineId));
let containers = $derived(app.containers.ofEngine(view.params.engineId));
let secrets = $derived(app.secrets.ofEngine(view.params.engineId));
let podman = $derived(engine?.connection.type === 'podman');

// the network and the container of these modes, by default: the bridge network, the newest running container
let network = $derived((networks.find(item => item.Name === 'bridge') ?? networks[0])?.Id ?? '');
let container = $derived(
  (containers.filter(item => item.State === 'running').toSorted((a, b) => b.Created - a.Created)[0] ?? containers[0])
    ?.Id ?? '',
);

let nameTaken = $derived(
  !!form.name.trim() && containers.some(container => container.Names.includes(`/${form.name.trim()}`)),
);
let creating = $derived(result?.status === 'creating');
let valid = $derived(
  !nameTaken &&
    Object.keys(portErrors).length === 0 &&
    (form.networkMode !== 'network' || !!network) &&
    (form.networkMode !== 'container' || !!container),
);

/** a port of the host free for the port of the container (a range of free ports for a range), else nothing */
async function freePort(containerPort: string): Promise<string> {
  try {
    const { start, end } = portRange(containerPort);
    if (start === end) {
      return String(await window.getFreePort(start));
    }
    return await window.getFreePortRange(end - start + 1);
  } catch {
    return '';
  }
}

// the entrypoint, the command and the ports of the image, with free ports of the host for them
async function prefill(): Promise<void> {
  const { engineId, imageId } = untrack(() => view.params);
  const inspect = await window.getImageInspect(engineId, imageId);
  const config = inspect.Config;
  form.command = joinArguments(config?.Cmd ?? []);
  const entrypoint = config?.Entrypoint;
  form.entrypoint = typeof entrypoint === 'string' ? entrypoint : joinArguments(entrypoint ?? []);
  const exposed = Object.keys(config?.ExposedPorts ?? {});
  const hosts = await Promise.all(exposed.map(freePort));
  form.ports = [
    ...exposed.map((port, index) => ({ hostPort: hosts[index] ?? '', containerPort: port })),
    ...form.ports,
  ];
  exposedPorts = exposed.length;
}
prefill()
  .catch((error: unknown) => console.error('Error inspecting the image', error))
  .finally(() => (loading = false));

// a port of the host is checked once typed
// eslint-disable-next-line svelte/prefer-svelte-reactivity -- the timers of the checks, not a reactive state
const checks = new Map<number, ReturnType<typeof setTimeout>>();
function checkPort(index: number): void {
  clearTimeout(checks.get(index));
  delete portErrors[index];
  const value = form.ports[index]?.hostPort.trim() ?? '';
  if (!/^\d+$/.test(value)) {
    return;
  }
  checks.set(
    index,
    setTimeout(() => {
      window
        .isFreePort(Number(value))
        .then(() => {
          delete portErrors[index];
        })
        .catch((error: unknown) => {
          if (form.ports[index]?.hostPort.trim() === value) {
            portErrors[index] = errorMessage(error);
          }
        });
    }, 500),
  );
}

function removePort(index: number): void {
  form.ports.splice(index, 1);
  // the errors follow their ports
  portErrors = Object.fromEntries(
    Object.entries(portErrors)
      .map(([key, error]) => [Number(key), error] as const)
      .filter(([key]) => key !== index)
      .map(([key, error]) => [key > index ? key - 1 : key, error]),
  );
}

async function browse(title: string, directory: boolean): Promise<string | undefined> {
  const [path] = (await window.openDialog({ title, selectors: [directory ? 'openDirectory' : 'openFile'] })) ?? [];
  return path;
}

async function create(start: boolean): Promise<void> {
  if (!valid || creating) {
    return;
  }
  result = { status: 'creating', start };
  try {
    const options = { ...createOptions(reference, { ...$state.snapshot(form), network, container }), start };
    const { id } = await window.createAndStartContainer(view.params.engineId, options);
    result = { status: 'created', start, id };
    // a container started with a terminal and an open input: its TTY, as v1 does
    if (start && options.Tty && options.OpenStdin) {
      app.workbench.open(viewRef('container-tty', { engineId: view.params.engineId, containerId: id }));
    }
  } catch (error: unknown) {
    result = { status: 'failed', start, error: errorMessage(error) };
  }
}

function created(id: string): string {
  const container = app.containers.get(view.params.engineId, id);
  return container ? containerName(container) : shortId(id);
}
</script>

{#snippet strings(values: string[], label: string, placeholder: string, add: string)}
  {#each values as _, index (index)}
    <div class="flex items-center gap-2">
      <Input bind:value={values[index]} {placeholder} aria-label="{label} {index + 1}" />
      <ActionButton icon={XIcon} label="Remove" size="icon-xs" onclick={(): unknown => values.splice(index, 1)} />
    </div>
  {/each}
  <div>
    <Button variant="outline" size="sm" onclick={(): number => values.push('')}>
      <PlusIcon data-icon="inline-start" />
      {add}
    </Button>
  </div>
{/snippet}

<Page
  icon={PlayIcon}
  title="Run"
  parent={{
    label: image ? imageLabel(image) : shortId(view.params.imageId),
    icon: LayersIcon,
    onOpen: (): void => view.open(viewRef('image-details', view.params)),
  }}>
  {#snippet meta()}
    <EngineBadge engineId={view.params.engineId} />
  {/snippet}
  {#snippet actions()}
    <Button variant="outline" disabled={!valid || creating || !engine} onclick={(): void => {
      create(false).catch(console.error);
    }}>
      Create
    </Button>
    <Button disabled={!valid || creating || !engine} onclick={(): void => {
      create(true).catch(console.error);
    }}>
      {#if creating}
        <Spinner data-icon="inline-start" />
      {:else}
        <PlayIcon data-icon="inline-start" />
      {/if}
      Create and start
    </Button>
  {/snippet}
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    {#if result}
      <!-- the last creation of this form -->
      <div class="flex items-center gap-2 rounded-lg border px-4 py-2.5" role="status">
        {#if result.status === 'creating'}
          <Spinner />
          <span class="flex-1">{result.start ? 'Creating and starting' : 'Creating'} the container…</span>
        {:else if result.status === 'created'}
          {@const id = result.id}
          <CircleCheckIcon class="size-4 text-state-success" />
          <span class="flex-1">{created(id)} {result.start ? 'started' : 'created'}.</span>
          <Button
            variant="outline"
            size="sm"
            onclick={(): void => view.open(viewRef('container-details', { engineId: view.params.engineId, containerId: id }))}>
            Open the container
          </Button>
        {:else}
          <CircleXIcon class="size-4 text-state-error" />
          <span class="min-w-0 flex-1 truncate text-state-error" title={result.error}>
            The container could not be {result.start ? 'started' : 'created'}: {result.error}
          </span>
        {/if}
      </div>
    {/if}
    <Card title="Container">
      <Field.Group>
        <Field.Field data-invalid={nameTaken || undefined}>
          <Field.Label for="run-name">Name (optional)</Field.Label>
          <Input id="run-name" bind:value={form.name} placeholder="A name is generated when not given" aria-invalid={nameTaken} />
          {#if nameTaken}
            <Field.Error>A container of this engine is already named {form.name.trim()}.</Field.Error>
          {/if}
        </Field.Field>
        <div class="grid grid-cols-2 gap-3">
          <Field.Field>
            <Field.Label for="run-entrypoint">Entrypoint</Field.Label>
            <Input id="run-entrypoint" bind:value={form.entrypoint} disabled={loading} placeholder="The entrypoint of the image" />
          </Field.Field>
          <Field.Field>
            <Field.Label for="run-command">Command</Field.Label>
            <Input id="run-command" bind:value={form.command} disabled={loading} placeholder="The command of the image" />
          </Field.Field>
        </div>
      </Field.Group>
    </Card>
    <Card title="Ports">
      <Field.Set>
        <Field.Description>The ports of the container published on the host: a port, or a range (8080-8090).</Field.Description>
        {#if loading}
          <Spinner />
        {/if}
        {#each form.ports as port, index (index)}
          <Field.Field data-invalid={!!portErrors[index] || undefined}>
            <div class="flex items-center gap-2">
              <Input
                bind:value={port.hostPort}
                placeholder="Host port"
                aria-label="Host port {index + 1}"
                aria-invalid={!!portErrors[index]}
                oninput={(): void => checkPort(index)} />
              <span class="text-muted-foreground">→</span>
              {#if index < exposedPorts}
                <!-- exposed by the image -->
                <span class="w-full truncate px-2.5">{port.containerPort}</span>
              {:else}
                <Input bind:value={port.containerPort} placeholder="Container port (80, 53/udp)" aria-label="Container port {index + 1}" />
              {/if}
              {#if index < exposedPorts}
                <div class="size-6 shrink-0"></div>
              {:else}
                <ActionButton icon={XIcon} label="Remove the port" size="icon-xs" onclick={(): void => removePort(index)} />
              {/if}
            </div>
            {#if portErrors[index]}
              <Field.Error>{portErrors[index]}</Field.Error>
            {/if}
          </Field.Field>
        {/each}
        <div>
          <Button variant="outline" size="sm" onclick={(): number => form.ports.push({ hostPort: '', containerPort: '' })}>
            <PlusIcon data-icon="inline-start" />
            Add a port
          </Button>
        </div>
      </Field.Set>
    </Card>
    <Card title="Volumes">
      <Field.Set>
        <Field.Description>Directories of the host, or volumes of the engine, mounted in the container.</Field.Description>
        {#each form.volumes as volume, index (index)}
          <div class="flex items-center gap-2">
            <div class="w-40 shrink-0">
              <ChoiceSelect
                bind:value={volume.type}
                aria-label="Type of the volume {index + 1}"
                options={VOLUME_TYPES}
                onValueChange={(): void => {
                  volume.source = '';
                }} />
            </div>
            {#if volume.type === 'bind'}
              <InputGroup.Root>
                <InputGroup.Input bind:value={volume.source} placeholder="/path/on/the/host" aria-label="Host directory {index + 1}" />
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Button
                    size="icon-xs"
                    aria-label="Browse"
                    onclick={(): void =>
                      void browse('Choose a directory to mount', true)
                        .then(path => {
                          volume.source = path ?? volume.source;
                        })
                        .catch(console.error)}>
                    <FolderOpenIcon />
                  </InputGroup.Button>
                </InputGroup.Addon>
              </InputGroup.Root>
            {:else}
              <ChoiceSelect
                bind:value={volume.source}
                aria-label="Volume {index + 1}"
                placeholder="Choose a volume"
                options={volumes.map(item => ({
                  value: item.Name,
                  label: item.Name.length > 24 ? shortId(item.Name) : item.Name,
                }))} />
            {/if}
            <Input bind:value={volume.target} placeholder="/path/in/the/container" aria-label="Path in the container {index + 1}" />
            <ActionButton icon={XIcon} label="Remove the volume" size="icon-xs" onclick={(): unknown => form.volumes.splice(index, 1)} />
          </div>
        {/each}
        <div>
          <Button variant="outline" size="sm" onclick={(): number => form.volumes.push({ type: 'bind', source: '', target: '' })}>
            <PlusIcon data-icon="inline-start" />
            Add a volume
          </Button>
        </div>
      </Field.Set>
    </Card>
    <Card title="Environment">
      <Field.Group>
        <Field.Set>
          <Field.Legend variant="label">Variables</Field.Legend>
          {#each form.env as entry, index (index)}
            <div class="flex items-center gap-2">
              <Input bind:value={entry.key} placeholder="Name" aria-label="Name of the variable {index + 1}" />
              <Input bind:value={entry.value} placeholder="Value (empty when not given)" aria-label="Value of the variable {index + 1}" />
              <ActionButton icon={XIcon} label="Remove the variable" size="icon-xs" onclick={(): unknown => form.env.splice(index, 1)} />
            </div>
          {/each}
          <div>
            <Button variant="outline" size="sm" onclick={(): number => form.env.push({ key: '', value: '' })}>
              <PlusIcon data-icon="inline-start" />
              Add a variable
            </Button>
          </div>
        </Field.Set>
        <Field.Set>
          <Field.Legend variant="label">Files of variables</Field.Legend>
          {#each form.envFiles as _, index (index)}
            <div class="flex items-center gap-2">
              <InputGroup.Root>
                <InputGroup.Input bind:value={form.envFiles[index]} placeholder="/path/to/.env" aria-label="File of variables {index + 1}" />
                <InputGroup.Addon align="inline-end">
                  <InputGroup.Button
                    size="icon-xs"
                    aria-label="Browse"
                    onclick={(): void =>
                      void browse('Choose a file of variables', false)
                        .then(path => {
                          form.envFiles[index] = path ?? form.envFiles[index] ?? '';
                        })
                        .catch(console.error)}>
                    <FolderOpenIcon />
                  </InputGroup.Button>
                </InputGroup.Addon>
              </InputGroup.Root>
              <ActionButton icon={XIcon} label="Remove the file" size="icon-xs" onclick={(): unknown => form.envFiles.splice(index, 1)} />
            </div>
          {/each}
          <div>
            <Button variant="outline" size="sm" onclick={(): number => form.envFiles.push('')}>
              <PlusIcon data-icon="inline-start" />
              Add a file
            </Button>
          </div>
        </Field.Set>
        {#if podman}
          <Field.Set>
            <Field.Legend variant="label">Secrets</Field.Legend>
            {#each form.secrets as secret, index (index)}
              <div class="flex items-center gap-2">
                <ChoiceSelect
                  bind:value={secret.name}
                  aria-label="Secret {index + 1}"
                  options={secrets.map(item => ({ value: item.Name, label: item.Name }))} />
                <div class="w-40 shrink-0">
                  <ChoiceSelect bind:value={secret.type} aria-label="Type of the secret {index + 1}" options={SECRET_TYPES} />
                </div>
                <Input
                  bind:value={secret.target}
                  placeholder={secret.type === 'mount' ? 'File name in /run/secrets' : 'Variable name'}
                  aria-label="Target of the secret {index + 1}" />
                <ActionButton icon={XIcon} label="Remove the secret" size="icon-xs" onclick={(): unknown => form.secrets.splice(index, 1)} />
              </div>
            {/each}
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={!secrets.length}
                onclick={(): number => form.secrets.push({ name: secrets[0]?.Name ?? '', type: 'mount', target: '' })}>
                <PlusIcon data-icon="inline-start" />
                Add a secret
              </Button>
            </div>
            {#if !secrets.length}
              <Field.Description>This engine has no secrets.</Field.Description>
            {/if}
          </Field.Set>
        {/if}
      </Field.Group>
    </Card>
    <Card title="Advanced">
      <Field.Group>
        <div class="grid grid-cols-2 gap-3">
          <Field.Field orientation="horizontal">
            <Checkbox id="run-tty" bind:checked={form.tty} />
            <Field.Label for="run-tty">Attach a pseudo terminal</Field.Label>
          </Field.Field>
          <Field.Field orientation="horizontal">
            <Checkbox id="run-interactive" bind:checked={form.interactive} />
            <Field.Label for="run-interactive">Keep the input open (interactive)</Field.Label>
          </Field.Field>
          <Field.Field orientation="horizontal">
            <Checkbox id="run-remove" bind:checked={form.autoRemove} />
            <Field.Label for="run-remove">Delete the container when it exits</Field.Label>
          </Field.Field>
        </div>
        <Field.Field>
          <Field.Label for="run-user">User (optional)</Field.Label>
          <Input id="run-user" bind:value={form.user} placeholder="The user of the image" />
        </Field.Field>
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
          <Field.Field>
            <Field.Label for="run-restart">Restart policy</Field.Label>
            <ChoiceSelect id="run-restart" bind:value={form.restartPolicy} options={RESTART_POLICIES} />
          </Field.Field>
          </div>
          <Field.Field>
            <Field.Label for="run-retries">Retries</Field.Label>
            <Input id="run-retries" type="number" min={0} bind:value={form.retries} disabled={form.restartPolicy !== 'on-failure'} />
          </Field.Field>
        </div>
        <Field.Set>
          <Field.Legend variant="label">Devices</Field.Legend>
          {#each form.devices as device, index (index)}
            <div class="flex items-center gap-2">
              <Input bind:value={device.host} placeholder="/dev/on/the/host" aria-label="Device of the host {index + 1}" />
              <Input bind:value={device.container} placeholder="In the container (the same when empty)" aria-label="Device in the container {index + 1}" />
              {#each [['read', 'r'], ['write', 'w'], ['mknod', 'm']] as const as [permission, letter] (permission)}
                <div class="shrink-0">
                <Field.Field orientation="horizontal">
                  <Checkbox id="run-device-{index}-{permission}" bind:checked={device[permission]} />
                  <Field.Label for="run-device-{index}-{permission}" title={permission}>{letter}</Field.Label>
                </Field.Field>
                </div>
              {/each}
              <ActionButton icon={XIcon} label="Remove the device" size="icon-xs" onclick={(): unknown => form.devices.splice(index, 1)} />
            </div>
          {/each}
          <div>
            <Button
              variant="outline"
              size="sm"
              onclick={(): number => form.devices.push({ host: '', container: '', read: false, write: false, mknod: false })}>
              <PlusIcon data-icon="inline-start" />
              Add a device
            </Button>
          </div>
          {#if form.devices.length}
            <Field.Description>Read, write, mknod: all of them when none is checked.</Field.Description>
          {/if}
        </Field.Set>
      </Field.Group>
    </Card>
    <Card title="Networking">
      <Field.Group>
        <div class="grid grid-cols-2 gap-3">
          <Field.Field>
            <Field.Label for="run-network-mode">Network</Field.Label>
            <ChoiceSelect id="run-network-mode" bind:value={form.networkMode} options={NETWORK_MODES} />
          </Field.Field>
          {#if form.networkMode === 'network'}
            <Field.Field>
              <Field.Label for="run-network">Of the network</Field.Label>
              <ChoiceSelect
                id="run-network"
                bind:value={network}
                options={networks.map(item => ({ value: item.Id, label: item.Name }))} />
            </Field.Field>
          {:else if form.networkMode === 'container'}
            <Field.Field>
              <Field.Label for="run-network-container">Of the container</Field.Label>
              <ChoiceSelect
                id="run-network-container"
                bind:value={container}
                options={containers.map(item => ({ value: item.Id, label: `${containerName(item)} (${shortId(item.Id)})` }))} />
            </Field.Field>
          {/if}
        </div>
        <Field.Field>
          <Field.Label for="run-hostname">Hostname (optional)</Field.Label>
          <Input id="run-hostname" bind:value={form.hostname} placeholder="The ID of the container when not given" />
        </Field.Field>
        <Field.Set>
          <Field.Legend variant="label">DNS servers</Field.Legend>
          {@render strings(form.dns, 'DNS server', 'IP address', 'Add a server')}
        </Field.Set>
        <Field.Set>
          <Field.Legend variant="label">Hosts (added to /etc/hosts)</Field.Legend>
          {#each form.extraHosts as entry, index (index)}
            <div class="flex items-center gap-2">
              <Input bind:value={entry.host} placeholder="Name" aria-label="Name of the host {index + 1}" />
              <Input bind:value={entry.ip} placeholder="IP address" aria-label="Address of the host {index + 1}" />
              <ActionButton icon={XIcon} label="Remove the host" size="icon-xs" onclick={(): unknown => form.extraHosts.splice(index, 1)} />
            </div>
          {/each}
          <div>
            <Button variant="outline" size="sm" onclick={(): number => form.extraHosts.push({ host: '', ip: '' })}>
              <PlusIcon data-icon="inline-start" />
              Add a host
            </Button>
          </div>
        </Field.Set>
      </Field.Group>
    </Card>
    <Card title="Security">
      <Field.Group>
        <div class="grid grid-cols-2 gap-3">
          <Field.Field orientation="horizontal">
            <Checkbox id="run-privileged" bind:checked={form.privileged} />
            <Field.Label for="run-privileged">Privileged (no security restrictions)</Field.Label>
          </Field.Field>
          <Field.Field orientation="horizontal">
            <Checkbox id="run-read-only" bind:checked={form.readOnly} />
            <Field.Label for="run-read-only">Read-only root filesystem</Field.Label>
          </Field.Field>
        </div>
        <Field.Field>
          <Field.Label for="run-userns">User namespace (optional)</Field.Label>
          <Input id="run-userns" bind:value={form.userns} placeholder="keep-id, auto, host" />
        </Field.Field>
        <Field.Set>
          <Field.Legend variant="label">Security options</Field.Legend>
          {@render strings(form.securityOptions, 'Security option', 'label=disable', 'Add an option')}
        </Field.Set>
        <div class="grid grid-cols-2 gap-3">
          <Field.Set>
            <Field.Legend variant="label">Capabilities added</Field.Legend>
            {@render strings(form.capAdd, 'Capability added', 'NET_ADMIN', 'Add a capability')}
          </Field.Set>
          <Field.Set>
            <Field.Legend variant="label">Capabilities dropped</Field.Legend>
            {@render strings(form.capDrop, 'Capability dropped', 'ALL', 'Drop a capability')}
          </Field.Set>
        </div>
      </Field.Group>
    </Card>
  </div>
</Page>
