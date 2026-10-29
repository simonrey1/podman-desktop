<script lang="ts">
import EyeIcon from '@lucide/svelte/icons/eye';
import EyeOffIcon from '@lucide/svelte/icons/eye-off';
import type { Registry } from '@podman-desktop/api';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import * as InputGroup from '#lib/components/ui/input-group/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { registryHost } from '#lib/stores/registries.svelte.js';

interface Props {
  /** the registry signed in to, to change its credentials; none to sign in to a new one */
  registry?: Registry;
  /** the address of a new registry, e.g. a suggested one */
  url?: string;
  /** the name of the registry, e.g. of a suggestion */
  name?: string;
  onClose: () => void;
}

// signs in to a registry: the credentials are checked before they are saved
let { registry, url = '', name, onClose }: Props = $props();

const app = getApp();

// a registry with a certificate not trusted: the user is asked to add it anyway
const UNTRUSTED = ['unable to verify the first certificate', 'self signed certificate in certificate chain'];

let server = $derived(registry ? registry.serverUrl : url);
let username = $derived(registry?.username ?? '');
let secret = $derived(registry?.secret ?? '');
let showSecret = $state(false);
let running = $state(false);
let error: string | undefined = $state();

let valid = $derived(!!registryHost(server) && !!username.trim() && !!secret);
let title = $derived(
  registry
    ? `Sign in to ${name ?? registryHost(registry.serverUrl)}`
    : name
      ? `Sign in to ${name}`
      : 'Sign in to a registry',
);

async function check(options: {
  serverUrl: string;
  username: string;
  secret: string;
  insecure?: boolean;
}): Promise<boolean> {
  try {
    await window.checkImageCredentials(options);
    return true;
  } catch (err: unknown) {
    const message = errorMessage(err);
    if (!options.insecure && UNTRUSTED.some(text => message.includes(text))) {
      const add = await app.confirmations.ask({
        title: 'Untrusted registry',
        message: `The certificate of ${options.serverUrl} is not trusted (${message}). Add the registry anyway?`,
        confirmLabel: 'Add',
      });
      if (add) {
        options.insecure = true;
        return true;
      }
      return false;
    }
    throw err;
  }
}

async function signIn(): Promise<void> {
  running = true;
  error = undefined;
  try {
    const options = {
      serverUrl: registry ? registry.serverUrl : registryHost(server),
      username: username.trim(),
      secret,
      insecure: registry?.insecure,
    };
    if (!(await check(options))) {
      return;
    }
    if (registry) {
      await window.updateImageRegistry({ ...$state.snapshot(registry), ...options });
    } else {
      const [source] = await window.getImageRegistryProviderNames();
      if (!source) {
        throw new Error('No provider of registries');
      }
      await window.createImageRegistry(source, options);
    }
    toast.success(`Signed in to ${name ?? registryHost(options.serverUrl)}`);
    onClose();
  } catch (err: unknown) {
    error = errorMessage(err);
  } finally {
    running = false;
  }
}
</script>

<Dialog.Root
  open
  onOpenChange={(open): void => {
    if (!open && !running) {
      onClose();
    }
  }}>
  <Dialog.Content size="sm">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Description>The credentials are checked, then used to pull and push the images.</Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        signIn().catch(console.error);
      }}>
      <Dialog.Body>
        <Field.Group>
          <Field.Field>
            <Field.Label for="registry-url">Registry</Field.Label>
            <Input id="registry-url" bind:value={server} disabled={!!registry || !!url} placeholder="quay.io" />
          </Field.Field>
          <Field.Field>
            <Field.Label for="registry-username">Username</Field.Label>
            <Input id="registry-username" bind:value={username} autocomplete="username" />
          </Field.Field>
          <Field.Field>
            <Field.Label for="registry-secret">Password or token</Field.Label>
            <InputGroup.Root>
              <InputGroup.Input
                id="registry-secret"
                type={showSecret ? 'text' : 'password'}
                bind:value={secret}
                autocomplete="current-password" />
              <InputGroup.Addon align="inline-end">
                <InputGroup.Button
                  size="icon-xs"
                  aria-label={showSecret ? 'Hide' : 'Show'}
                  onclick={(): void => {
                    showSecret = !showSecret;
                  }}>
                  {#if showSecret}<EyeOffIcon />{:else}<EyeIcon />{/if}
                </InputGroup.Button>
              </InputGroup.Addon>
            </InputGroup.Root>
          </Field.Field>
          {#if error}
            <Field.Error>{error}</Field.Error>
          {/if}
        </Field.Group>
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" disabled={running} onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={running || !valid}>
          {#if running}<Spinner data-icon="inline-start" />{/if}
          Sign in
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
