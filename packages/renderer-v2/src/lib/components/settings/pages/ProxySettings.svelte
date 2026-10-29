<script lang="ts">
import { PROXY_CONFIG_KEYS, ProxyState } from '@desktop-framework/api';
import LockIcon from '@lucide/svelte/icons/lock';

import { getApp } from '#lib/app.svelte.js';
import Card from '#lib/components/Card.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import * as NativeSelect from '#lib/components/ui/native-select/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';

// the proxy of Podman Desktop and of the engines it starts: the one of the system, one given, or none
const app = getApp();

const MODES = [
  { value: ProxyState.PROXY_SYSTEM, label: 'The proxy of the system' },
  { value: ProxyState.PROXY_MANUAL, label: 'A proxy given here' },
  { value: ProxyState.PROXY_DISABLED, label: 'No proxy' },
];

let mode = $state<ProxyState>(ProxyState.PROXY_SYSTEM);
let http = $state('');
let https = $state('');
let noProxy = $state('');
let loaded = $state(false);
let saving = $state(false);
let error: string | undefined = $state();
let saved: string | undefined = $state();

// managed by the organization: shown, not editable
let locked = $derived(
  Object.fromEntries(
    Object.values(PROXY_CONFIG_KEYS).map(key => [key, !!app.configuration.items.find(item => item.id === key)?.locked]),
  ),
);
let modeLocked = $derived(!!locked[PROXY_CONFIG_KEYS.ENABLED]);
let manual = $derived(mode === ProxyState.PROXY_MANUAL);

Promise.all([window.getProxyState(), window.getProxySettings()])
  .then(([state, settings]) => {
    mode = state;
    http = settings?.httpProxy ?? '';
    https = settings?.httpsProxy ?? '';
    noProxy = settings?.noProxy ?? '';
    loaded = true;
  })
  .catch((err: unknown) => {
    error = errorMessage(err);
  });

/** the error of a proxy address, else nothing: a URL with a host, e.g. http://proxy.example.com:3128 */
function addressError(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }
  try {
    return new URL(value.trim()).hostname ? undefined : 'A host is expected';
  } catch {
    return 'An address like http://proxy.example.com:3128 is expected';
  }
}

let httpError = $derived(manual ? addressError(http) : undefined);
let httpsError = $derived(manual ? addressError(https) : undefined);

async function save(): Promise<void> {
  saving = true;
  error = undefined;
  saved = undefined;
  try {
    await window.setProxyState(mode);
    if (mode !== ProxyState.PROXY_SYSTEM) {
      await window.updateProxySettings({ httpProxy: http.trim(), httpsProxy: https.trim(), noProxy: noProxy.trim() });
    }
    // the engines running keep the proxy they started with
    saved = app.engines.all.some(engine => engine.status === 'started')
      ? 'Saved. The engines running use it once restarted, and so do their containers.'
      : 'Saved.';
  } catch (err: unknown) {
    error = errorMessage(err);
  } finally {
    saving = false;
  }
}
</script>

{#snippet managed(key: string)}
  {#if locked[key]}
    <Field.Description><LockIcon class="inline size-3" /> Managed by your organization</Field.Description>
  {/if}
{/snippet}

<Card title="Proxy server">
  <Field.Group>
    <Field.Field>
      <Field.Label for="proxy-mode">Proxy</Field.Label>
      <NativeSelect.Root
        id="proxy-mode"
        disabled={!loaded || modeLocked}
        value={String(mode)}
        onchange={(event): void => {
          mode = Number((event.currentTarget as HTMLSelectElement).value) as ProxyState;
        }}>
        {#each MODES as option (option.value)}
          <NativeSelect.Option value={String(option.value)}>{option.label}</NativeSelect.Option>
        {/each}
      </NativeSelect.Root>
      {@render managed(PROXY_CONFIG_KEYS.ENABLED)}
    </Field.Field>
    <Field.Field data-invalid={!!httpError || undefined}>
      <Field.Label for="proxy-http">HTTP proxy</Field.Label>
      <Input
        id="proxy-http"
        bind:value={http}
        disabled={!manual || !!locked[PROXY_CONFIG_KEYS.HTTP]}
        placeholder="http://proxy.example.com:3128"
        aria-invalid={!!httpError} />
      {#if httpError}<Field.Error>{httpError}</Field.Error>{/if}
      {@render managed(PROXY_CONFIG_KEYS.HTTP)}
    </Field.Field>
    <Field.Field data-invalid={!!httpsError || undefined}>
      <Field.Label for="proxy-https">HTTPS proxy</Field.Label>
      <Input
        id="proxy-https"
        bind:value={https}
        disabled={!manual || !!locked[PROXY_CONFIG_KEYS.HTTPS]}
        placeholder="http://proxy.example.com:3128"
        aria-invalid={!!httpsError} />
      {#if httpsError}<Field.Error>{httpsError}</Field.Error>{/if}
      {@render managed(PROXY_CONFIG_KEYS.HTTPS)}
    </Field.Field>
    <Field.Field>
      <Field.Label for="proxy-no">Without the proxy</Field.Label>
      <Input
        id="proxy-no"
        bind:value={noProxy}
        disabled={!manual || !!locked[PROXY_CONFIG_KEYS.NO_PROXY]}
        placeholder="localhost,127.0.0.1,.example.com" />
      <Field.Description>The hosts and domains reached directly, separated by commas.</Field.Description>
      {@render managed(PROXY_CONFIG_KEYS.NO_PROXY)}
    </Field.Field>
    <div class="flex items-center gap-3">
      <Button
        disabled={!loaded || saving || !!httpError || !!httpsError}
        onclick={(): void => {
          save().catch(console.error);
        }}>
        {#if saving}<Spinner data-icon="inline-start" />{/if}
        Save
      </Button>
      {#if saved}<span class="text-muted-foreground" role="status">{saved}</span>{/if}
    </div>
    {#if error}
      <Field.Error>{error}</Field.Error>
    {/if}
  </Field.Group>
</Card>
