<script lang="ts">
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import LogInIcon from '@lucide/svelte/icons/log-in';
import LogOutIcon from '@lucide/svelte/icons/log-out';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import Card from '#lib/components/Card.svelte';
import ImageIcon from '#lib/components/ImageIcon.svelte';
import StatusDot from '#lib/components/StatusDot.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import { iconOf } from '#lib/stores/accessories.svelte.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';

// the accounts of the authentication providers of the extensions, and the sign-ins they ask for
const app = getApp();

let providers = $derived(app.authentication.items);

function run(call: Promise<void>, failure: string): void {
  call.catch((error: unknown) => toast.error(failure, { description: errorMessage(error) }));
}
</script>

{#each providers as provider (provider.id)}
  {@const icon = iconOf(provider.images)}
  <Card title={provider.displayName}>
    <div class="flex items-center gap-2">
      {#if icon}
        <ImageIcon {icon} />
      {:else}
        <KeyRoundIcon class="size-5 text-muted-foreground" />
      {/if}
      <StatusDot status={provider.accounts.length ? 'running' : 'stopped'} decorative />
      <span class="text-muted-foreground">{provider.accounts.length ? 'Signed in' : 'Signed out'}</span>
    </div>
    {#if provider.accounts.length}
      <ul class="flex flex-col divide-y">
        {#each provider.accounts as account (account.id)}
          <li class="flex items-center gap-3 py-2">
            <span class="min-w-0 flex-1 truncate">{account.label}</span>
            <ActionButton
              icon={LogOutIcon}
              label="Sign out of {account.label}"
              onclick={(): void =>
                run(window.requestAuthenticationProviderSignOut(provider.id, account.id), `Sign out of ${account.label} failed`)} />
          </li>
        {/each}
      </ul>
    {/if}
    {#if provider.sessionRequests?.length}
      <!-- the extensions asking for an account of this provider -->
      <div class="flex flex-wrap gap-2">
        {#each provider.sessionRequests as request (request.id)}
          <Button
            variant="outline"
            size="sm"
            onclick={(): void => run(window.requestAuthenticationProviderSignIn(request.id), `Sign in to ${provider.displayName} failed`)}>
            <LogInIcon data-icon="inline-start" />
            Sign in{provider.sessionRequests.length > 1 ? ` for ${request.extensionLabel}` : ''}
          </Button>
        {/each}
      </div>
    {/if}
  </Card>
{:else}
  {#if app.authentication.loaded}
    <p class="py-8 text-center text-muted-foreground">
      No authentication provider: the extensions add them, e.g. to sign in to an account.
    </p>
  {/if}
{/each}
