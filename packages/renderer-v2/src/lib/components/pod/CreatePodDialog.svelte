<script lang="ts">
import type { ContainerInfo, PodCreateOptions } from '@desktop-framework/api';

import { getApp } from '#lib/app.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import { Checkbox } from '#lib/components/ui/checkbox/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { containerName } from '#lib/stores/containers.svelte.js';
import { viewRef } from '#lib/views/index.js';

interface Props {
  /** the engine of the containers */
  engineId: string;
  containers: ContainerInfo[];
  onClose: () => void;
}

// creates a pod with copies of the containers (stopped first, the originals are kept), exposing their ports
let { engineId, containers, onClose }: Props = $props();

const app = getApp();

type PortMapping = NonNullable<PodCreateOptions['portmappings']>[number];

// the ports the containers publish, the pod exposes the ones checked
let ports = $derived(
  containers.flatMap(container =>
    (container.Ports ?? [])
      .filter(port => port.PublicPort)
      .map(port => ({
        key: `${container.Id}:${port.PublicPort}/${port.Type}`,
        container: containerName(container),
        mapping: {
          host_ip: port.IP ?? '',
          host_port: port.PublicPort,
          container_port: port.PrivatePort,
          protocol: '',
          range: 1,
        } satisfies PortMapping,
      })),
  ),
);

let name = $state('my-pod');
let unexposed: Record<string, boolean> = $state({});
let creating = $state(false);
let error: string | undefined = $state();

async function create(): Promise<void> {
  const connection = app.engines.get(engineId)?.connection;
  if (!connection) {
    error = 'The engine is not available';
    return;
  }
  creating = true;
  error = undefined;
  try {
    const pod = await window.createPod({
      name: name.trim(),
      portmappings: ports.filter(port => !unexposed[port.key]).map(port => port.mapping),
      provider: $state.snapshot(connection),
    });
    // the containers are stopped, then copied into the pod
    await Promise.all(
      containers
        .filter(container => container.State === 'running')
        .map(container => window.stopContainer(engineId, container.Id)),
    );
    for (const container of containers) {
      await window.replicatePodmanContainer(
        { engineId, id: container.Id },
        { engineId: pod.engineId },
        { pod: pod.Id, name: `${containerName(container)}-podified` },
      );
    }
    await window.startPod(pod.engineId, pod.Id);
    onClose();
    app.workbench.open(viewRef('pod-details', { engineId: pod.engineId, podId: pod.Id }));
  } catch (err: unknown) {
    error = errorMessage(err);
  } finally {
    creating = false;
  }
}
</script>

<Dialog.Root
  open
  onOpenChange={(open): void => {
    if (!open && !creating) {
      onClose();
    }
  }}>
  <Dialog.Content size="md">
    <Dialog.Header>
      <Dialog.Title>Create a pod</Dialog.Title>
      <Dialog.Description>
        With a copy of {containers.length === 1 ? 'the container' : `the ${containers.length} containers`}: they are
        stopped, the originals are kept.
      </Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        create().catch(console.error);
      }}>
      <Dialog.Body>
        <Field.Group>
          <Field.Field>
            <Field.Label for="pod-name">Name</Field.Label>
            <Input id="pod-name" bind:value={name} />
          </Field.Field>
          <Field.Set>
            <Field.Legend variant="label">Containers</Field.Legend>
            <!-- a copy of each, named after it -->
            <ul class="max-h-32 overflow-y-auto rounded-md border px-2.5 py-1.5 text-sm">
              {#each containers as container (container.Id)}
                <li class="flex gap-1.5 py-0.5">
                  <span class="truncate">{containerName(container)}</span>
                  <span class="shrink-0 text-muted-foreground">→ {containerName(container)}-podified</span>
                </li>
              {/each}
            </ul>
          </Field.Set>
          {#if ports.length}
            <Field.Set>
              <Field.Legend variant="label">Ports exposed by the pod</Field.Legend>
              <div class="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-md border px-2.5 py-2">
                {#each ports as port (port.key)}
                  <Field.Field orientation="horizontal">
                    <Checkbox
                      id="pod-port-{port.key}"
                      checked={!unexposed[port.key]}
                      onCheckedChange={(checked): void => {
                        unexposed[port.key] = !checked;
                      }} />
                    <Field.Label for="pod-port-{port.key}">
                      <span class="tabular-nums">{port.mapping.host_port} → {port.mapping.container_port}</span>
                      <span class="text-muted-foreground">{port.container}</span>
                    </Field.Label>
                  </Field.Field>
                {/each}
              </div>
            </Field.Set>
          {/if}
          {#if error}
            <Field.Error>{error}</Field.Error>
          {/if}
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" disabled={creating} onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={creating || !name.trim()}>
          {#if creating}
            <Spinner data-icon="inline-start" />
          {/if}
          Create
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
