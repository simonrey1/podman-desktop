<script lang="ts">
import type { ProviderInfo } from '@desktop-framework/api';
import type { ConfigurationScope } from '@desktop-framework/api/configuration';
import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
import type { AuditRecord } from '@podman-desktop/api';
import { untrack } from 'svelte';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import SettingItem from '#lib/components/settings/SettingItem.svelte';
import { defaultValue, settingKind } from '#lib/components/settings/settings.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Collapsible from '#lib/components/ui/collapsible/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import type { Setting } from '#lib/stores/configuration.svelte.js';
import type { Connection, ConnectionKind } from '#lib/stores/engines.svelte.js';

interface Props {
  provider: ProviderInfo;
  kind: ConnectionKind;
  /** the connection to edit; none to create one */
  connection?: Connection;
  onClose: () => void;
}

// creates a connection of a provider (e.g. a Podman machine, a kind cluster), or edits one: the fields are the settings
// of the provider for it, the values kept when it fails, its logs shown
let { provider, kind, connection, onClose }: Props = $props();

const app = getApp();

// the scope of the settings of the form: the factory (creation) or the connection (edition)
const SCOPES: Record<ConnectionKind, { create: ConfigurationScope; edit: ConfigurationScope }> = {
  container: { create: 'ContainerProviderConnectionFactory', edit: 'ContainerConnection' },
  kubernetes: { create: 'KubernetesProviderConnectionFactory', edit: 'KubernetesConnection' },
  vm: { create: 'VmProviderConnectionFactory', edit: 'VmConnection' },
};

const editing = untrack(() => connection);
const scope = untrack(() => SCOPES[kind][editing ? 'edit' : 'create']);

// the host bounds the resources of a connection (its CPUs, its memory, its disk)
let host: { cpu: number; memory: number; disk: number } | undefined = $state.raw();
Promise.all([window.getOsCpu(), window.getOsMemory(), window.getOsFreeDiskSize()])
  .then(([cpu, memory, disk]) => {
    host = { cpu: Number(cpu), memory: Number(memory), disk: Number(disk) };
  })
  .catch((error: unknown) => console.error('Error reading the resources of the host', error));

function resolved(setting: Setting): Setting {
  const limits: Record<string, number | undefined> = {
    HOST_TOTAL_CPU: host?.cpu,
    HOST_TOTAL_MEMORY: host?.memory,
    HOST_TOTAL_DISKSIZE: host?.disk,
  };
  const maximum = typeof setting.maximum === 'string' ? limits[setting.maximum] : setting.maximum;
  const half = host ? Math.max(1, Math.floor(host.cpu / 2)) : 1;
  return {
    ...setting,
    maximum: maximum ?? undefined,
    default: setting.default === 'HOST_HALF_CPU_CORES' ? half : setting.default,
  };
}

// the settings of the provider in the scope; the ones with a `when` need the context keys of the extensions (not yet)
let fields = $derived(
  app.configuration.items
    .filter(setting => (Array.isArray(setting.scope) ? setting.scope.includes(scope) : setting.scope === scope))
    .filter(setting => setting.id.startsWith(provider.id) && !setting.hidden && !setting.when)
    .filter(setting => !(editing && setting.readonly))
    .filter(setting => settingKind(setting) !== 'unsupported')
    .map(resolved),
);

// the values of the form, and the ones changed (an edition sends these only)
let values: Record<string, unknown> = $state({});
let changed: string[] = $state([]);
let loaded = $state(false);

$effect(() => {
  if (loaded || !host || !fields.length) {
    return;
  }
  const target = untrack(() => fields);
  if (editing) {
    const info = $state.snapshot(editing.info) as unknown as ConfigurationScope;
    Promise.all(target.map(async field => [field.id, await window.getConfigurationValue(field.id, info)] as const))
      .then(entries => {
        values = Object.fromEntries(entries);
        loaded = true;
      })
      .catch((error: unknown) => {
        failure = errorMessage(error);
      });
  } else {
    values = Object.fromEntries(target.map(field => [field.id, defaultValue(field)]));
    loaded = true;
  }
});

// the provider checks the values of a creation (e.g. the memory left on the host)
let audit: AuditRecord[] = $state.raw([]);
$effect(() => {
  if (editing || !loaded) {
    return;
  }
  const items = $state.snapshot(values);
  const timer = setTimeout(() => {
    window
      .auditConnectionParameters(provider.internalId, items)
      .then(result => {
        audit = result.records;
      })
      .catch((error: unknown) => console.error('Error checking the values of the connection', error));
  }, 400);
  return (): void => clearTimeout(timer);
});
let invalid = $derived(audit.some(record => record.type === 'error'));

let running = $state(false);
let failure: string | undefined = $state();
let logs: string[] = $state([]);
let logsOpen = $state(false);
let tokenId: number | undefined;

function change(id: string, value: unknown): void {
  values[id] = value;
  if (!changed.includes(id)) {
    changed.push(id);
  }
}

async function submit(): Promise<void> {
  running = true;
  failure = undefined;
  logs = [];
  const key = Symbol(provider.id);
  const logger = (_key: symbol, event: 'log' | 'warn' | 'error' | 'finish', args: string[]): void => {
    if (event !== 'finish') {
      logs.push(args.join(' '));
    }
  };
  // an edition sends the values changed only
  const params = editing
    ? Object.fromEntries(Object.entries($state.snapshot(values)).filter(([id]) => changed.includes(id)))
    : $state.snapshot(values);
  try {
    tokenId = await window.getCancellableTokenSource();
    if (editing) {
      await window.editProviderConnectionLifecycle(
        provider.internalId,
        $state.snapshot(editing.info) as typeof editing.info,
        params,
        key,
        logger,
        tokenId,
        undefined,
      );
    } else {
      const create = {
        container: window.createContainerProviderConnection,
        kubernetes: window.createKubernetesProviderConnection,
        vm: window.createVmProviderConnection,
      }[kind];
      await create(provider.internalId, params, key, logger, tokenId, undefined);
    }
    toast.success(editing ? `${editing.name} updated` : `${createLabel} created`);
    onClose();
  } catch (error: unknown) {
    const message = errorMessage(error);
    failure = message.includes('Execution cancelled') ? 'Canceled' : message;
    logsOpen = logs.length > 0;
  } finally {
    running = false;
    tokenId = undefined;
  }
}

function cancel(): void {
  if (tokenId !== undefined) {
    window.cancelToken(tokenId).catch(console.error);
  }
}

let createLabel = $derived(
  {
    container: provider.containerProviderConnectionCreationDisplayName,
    kubernetes: provider.kubernetesProviderConnectionCreationDisplayName,
    vm: provider.vmProviderConnectionCreationDisplayName,
  }[kind] ?? provider.name,
);
let title = $derived(editing ? `Edit ${editing.name}` : `Create a ${createLabel}`);
</script>

<Dialog.Root
  open
  onOpenChange={(open): void => {
    if (!open && !running) {
      onClose();
    }
  }}>
  <Dialog.Content size="md">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>
        {editing ? `Its settings, applied by ${provider.name}.` : `With ${provider.name}: its settings, checked by the provider.`}
      </Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        submit().catch(console.error);
      }}>
      <Dialog.Body>
        <!-- the checks of the provider first: an error is why the creation is not possible -->
        {#each audit as record, index (index)}
          {#if record.type === 'error'}
            <Field.Error>{record.record}</Field.Error>
          {:else}
            <p class={['text-sm', record.type === 'warning' ? 'text-state-warning' : 'text-muted-foreground']}>{record.record}</p>
          {/if}
        {/each}
        {#if !loaded}
          <div class="flex items-center gap-2 text-muted-foreground"><Spinner />Reading the settings</div>
        {:else if fields.length === 0}
          <p class="text-muted-foreground">{provider.name} has no settings for it.</p>
        {:else}
          <fieldset class="flex flex-col divide-y" disabled={running}>
            {#each fields as field (field.id)}
              <SettingItem setting={field} value={values[field.id]} onChange={(value): void => change(field.id, value)} />
            {/each}
          </fieldset>
        {/if}
        {#if failure}
          <Field.Error>{failure}</Field.Error>
        {/if}
        {#if logs.length}
          <Collapsible.Root bind:open={logsOpen}>
            <Collapsible.Trigger>
              {#snippet child({ props })}
                <Button {...props} variant="ghost" size="sm">
                  <ChevronRightIcon data-icon="inline-start" class={['transition-transform', logsOpen && 'rotate-90']} />
                  Logs ({logs.length})
                </Button>
              {/snippet}
            </Collapsible.Trigger>
            <Collapsible.Content>
              <pre class="mt-2 max-h-48 overflow-auto rounded-md bg-terminal p-2 font-mono text-xs whitespace-pre-wrap select-text">{logs.join('\n')}</pre>
            </Collapsible.Content>
          </Collapsible.Root>
        {/if}
      </Dialog.Body>
      <Dialog.Footer>
        {#if running}
          <Button variant="outline" onclick={cancel}>Cancel</Button>
        {:else}
          <Button variant="outline" onclick={onClose}>Close</Button>
        {/if}
        <Button type="submit" disabled={running || !loaded || invalid || (!!editing && changed.length === 0)}>
          {#if running}<Spinner data-icon="inline-start" />{/if}
          {editing ? 'Update' : 'Create'}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
