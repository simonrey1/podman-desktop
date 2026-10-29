<script lang="ts">
import type { NetworkCreateOptions } from '@desktop-framework/api';
import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import { Checkbox } from '#lib/components/ui/checkbox/index.js';
import * as Collapsible from '#lib/components/ui/collapsible/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import * as NativeSelect from '#lib/components/ui/native-select/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';

interface Props {
  /** the engine creating the network */
  engineId: string;
  onClose: () => void;
}

// creates a network on the engine, then opens it; the addressing and the options are under Advanced
let { engineId, onClose }: Props = $props();

const app = getApp();

let engine = $derived(app.engines.get(engineId));
let podman = $derived(engine?.connection.type === 'podman');

// the drivers of the engine, e.g. bridge, macvlan, ipvlan
const drivers = new AsyncValue<string[]>(() =>
  engine ? window.getNetworkDrivers($state.snapshot(engine.connection)) : undefined,
);

let name = $state('');
let driver = $state('bridge');
let subnet = $state('');
let ipRange = $state('');
let gateway = $state('');
let ipv6 = $state(false);
let internal = $state(false);
let dns = $state('');
let creating = $state(false);
let error: string | undefined = $state();

// macvlan and ipvlan networks are on a subnet of the host
let requiresSubnet = $derived(driver === 'macvlan' || driver === 'ipvlan');
// the DNS servers of a network are a feature of the Podman bridges
let dnsAvailable = $derived(podman && driver === 'bridge');
let valid = $derived(!!name.trim() && (!requiresSubnet || !!subnet.trim()));

async function create(): Promise<void> {
  if (!engine) {
    error = 'The engine is not available';
    return;
  }
  creating = true;
  error = undefined;
  const config = {
    Subnet: subnet.trim(),
    ...(ipRange.trim() ? { IPRange: ipRange.trim() } : {}),
    ...(gateway.trim() ? { Gateway: gateway.trim() } : {}),
  };
  const options: NetworkCreateOptions = {
    Name: name.trim(),
    Driver: driver,
    EnableIPv6: ipv6,
    Internal: internal,
    IPAM: config.Subnet ? { Driver: 'default', Config: [config] } : undefined,
  };
  try {
    const created = await window.createNetwork($state.snapshot(engine.connection), options);
    // the compat API has no DNS servers: they are set with the Podman API
    const servers = dns.split(/[\s,]+/).filter(Boolean);
    if (dnsAvailable && servers.length > 0) {
      await window.updateNetwork(created.engineId, created.Id, servers, []);
    }
    onClose();
    app.workbench.open(viewRef('network-details', { engineId: created.engineId, networkId: created.Id }));
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
    if (!open) {
      onClose();
    }
  }}>
  <Dialog.Content size="md">
    <Dialog.Header>
      <Dialog.Title>Create a network</Dialog.Title>
      <Dialog.Description>On {app.engines.label(engineId, engineId)}.</Dialog.Description>
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
            <Field.Label for="network-name">Name</Field.Label>
            <Input id="network-name" bind:value={name} placeholder="my-network" />
          </Field.Field>
          <Field.Field>
            <Field.Label for="network-driver">Driver</Field.Label>
            <NativeSelect.Root id="network-driver" bind:value={driver}>
              {#each drivers.value ?? ['bridge'] as option (option)}
                <NativeSelect.Option value={option}>{option}</NativeSelect.Option>
              {/each}
            </NativeSelect.Root>
          </Field.Field>
          <Field.Field>
            <Field.Label for="network-subnet">Subnet{requiresSubnet ? '' : ' (optional)'}</Field.Label>
            <Input id="network-subnet" bind:value={subnet} placeholder="10.89.0.0/24" />
            {#if requiresSubnet}
              <Field.Description>A {driver} network needs the subnet of the host it is on.</Field.Description>
            {/if}
          </Field.Field>
          <Collapsible.Root>
            <Collapsible.Trigger>
              {#snippet child({ props })}
                <Button {...props} variant="ghost" size="sm">
                  <ChevronRightIcon
                    data-icon="inline-start"
                    class={['transition-transform', props['data-state'] === 'open' && 'rotate-90']} />
                  Advanced
                </Button>
              {/snippet}
            </Collapsible.Trigger>
            <Collapsible.Content>
              <div class="pt-3">
                <Field.Group>
                  <div class="grid grid-cols-2 gap-3">
                    <Field.Field>
                      <Field.Label for="network-range">IP range</Field.Label>
                      <Input id="network-range" bind:value={ipRange} placeholder="10.89.0.128/25" disabled={!subnet.trim()} />
                    </Field.Field>
                    <Field.Field>
                      <Field.Label for="network-gateway">Gateway</Field.Label>
                      <Input id="network-gateway" bind:value={gateway} placeholder="10.89.0.1" disabled={!subnet.trim()} />
                    </Field.Field>
                  </div>
                  <Field.Field orientation="horizontal">
                    <Checkbox id="network-ipv6" bind:checked={ipv6} />
                    <Field.Label for="network-ipv6">IPv6</Field.Label>
                  </Field.Field>
                  <Field.Field orientation="horizontal">
                    <Checkbox id="network-internal" bind:checked={internal} />
                    <Field.Label for="network-internal">Internal (no access to the outside)</Field.Label>
                  </Field.Field>
                  {#if dnsAvailable}
                    <Field.Field>
                      <Field.Label for="network-dns">DNS servers</Field.Label>
                      <Input id="network-dns" bind:value={dns} placeholder="8.8.8.8 1.1.1.1" />
                    </Field.Field>
                  {/if}
                </Field.Group>
              </div>
            </Collapsible.Content>
          </Collapsible.Root>
          {#if error}
            <Field.Error>{error}</Field.Error>
          {/if}
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={creating || !valid}>
          {#if creating}
            <Spinner data-icon="inline-start" />
          {/if}
          Create
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
