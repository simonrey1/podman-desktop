<script lang="ts">
import LogInIcon from '@lucide/svelte/icons/log-in';
import LogOutIcon from '@lucide/svelte/icons/log-out';
import PencilIcon from '@lucide/svelte/icons/pencil';
import ServerIcon from '@lucide/svelte/icons/server';
import type { Registry } from '@podman-desktop/api';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import Card from '#lib/components/Card.svelte';
import ImageIcon from '#lib/components/ImageIcon.svelte';
import RegistryLoginDialog from '#lib/components/registry/RegistryLoginDialog.svelte';
import SettingItem from '#lib/components/settings/SettingItem.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { registryHost } from '#lib/stores/registries.svelte.js';

// the registries signed in to, the ones suggested by the extensions, and the registries searched for short names
const app = getApp();

let registries = $derived(app.registries.items);
let suggestions = $derived(app.registries.available);
let preferred = $derived(app.configuration.items.find(setting => setting.id === 'registries.preferred'));

function displayName(registry: Registry): string {
  return registry.name ?? app.registries.suggestionOf(registry)?.name ?? registryHost(registry.serverUrl);
}

function edit(registry: Registry): void {
  app.modals.open(RegistryLoginDialog, { registry, name: displayName(registry) });
}

async function signOut(registry: Registry): Promise<void> {
  const confirmed = await app.confirmations.ask({
    title: `Sign out of ${displayName(registry)}`,
    message: `The credentials of ${registry.serverUrl} will be removed: its private images cannot be pulled nor pushed anymore.`,
    confirmLabel: 'Sign out',
    destructive: true,
  });
  if (!confirmed) {
    return;
  }
  try {
    await window.unregisterImageRegistry($state.snapshot(registry));
    toast.success(`Signed out of ${displayName(registry)}`);
  } catch (error: unknown) {
    toast.error(`Sign out of ${displayName(registry)} failed`, { description: errorMessage(error) });
  }
}
</script>

{#snippet icon(source: Registry['icon'], label: string)}
  {#if source}
    <ImageIcon icon={source} {label} />
  {:else}
    <ServerIcon class="size-5 shrink-0 text-muted-foreground" />
  {/if}
{/snippet}

<Card title="Signed in">
  {#if registries.length}
    <ul class="flex flex-col divide-y">
      {#each registries as registry (registry.serverUrl)}
        {@const label = displayName(registry)}
        <li class="flex items-center gap-3 py-2">
          {@render icon(registry.icon ?? app.registries.suggestionOf(registry)?.icon, label)}
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-medium">{label}</span>
            <span class="truncate text-sm text-muted-foreground">
              {registryHost(registry.serverUrl)} · {registry.alias ?? registry.username}{registry.insecure ? ' · certificate not checked' : ''}
            </span>
          </div>
          <ActionButton icon={PencilIcon} label="Change the credentials" onclick={(): void => edit(registry)} />
          <ActionButton
            icon={LogOutIcon}
            label="Sign out"
            onclick={(): void => {
              signOut(registry).catch(console.error);
            }} />
        </li>
      {/each}
    </ul>
  {:else if app.registries.loaded}
    <p class="text-muted-foreground">Not signed in to a registry: the public images only can be pulled.</p>
  {/if}
  <div>
    <Button variant="outline" size="sm" onclick={(): void => app.modals.open(RegistryLoginDialog, {})}>
      <LogInIcon data-icon="inline-start" />
      Sign in to a registry
    </Button>
  </div>
</Card>

{#if suggestions.length}
  <Card title="Suggested">
    <ul class="flex flex-col divide-y">
      {#each suggestions as suggestion (suggestion.url)}
        <li class="flex items-center gap-3 py-2">
          {@render icon(suggestion.icon, suggestion.name)}
          <div class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-medium">{suggestion.name}</span>
            <span class="truncate text-sm text-muted-foreground">{registryHost(suggestion.url)}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onclick={(): void => app.modals.open(RegistryLoginDialog, { url: suggestion.url, name: suggestion.name })}>
            Sign in
          </Button>
        </li>
      {/each}
    </ul>
  </Card>
{/if}

{#if preferred}
  <Card title="Short names">
    <SettingItem setting={preferred} />
  </Card>
{/if}
