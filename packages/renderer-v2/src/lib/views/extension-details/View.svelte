<script lang="ts">
import { isAutoUpdatable } from '@desktop-framework/api';
import DownloadIcon from '@lucide/svelte/icons/download';
import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import Card from '#lib/components/Card.svelte';
import { catalogActions, extensionActions, extensionBadges, extensionKey } from '#lib/components/extension/actions.js';
import ExtensionActions from '#lib/components/extension/ExtensionActions.svelte';
import ImageIcon from '#lib/components/ImageIcon.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import Markdown from '#lib/components/markdown/Markdown.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import StatusBadge from '#lib/components/StatusBadge.svelte';
import { Badge } from '#lib/components/ui/badge/index.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { Switch } from '#lib/components/ui/switch/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// an extension, installed or in the catalog: its README, what is known about it, and its error when it failed
const app = getApp();

let extension = $derived(app.extensions.get(view.params.extensionId));
let entry = $derived(app.catalog.get(view.params.extensionId));
let name = $derived(extension?.displayName ?? entry?.displayName ?? view.params.extensionId);
let icon = $derived(extension?.icon ?? entry?.icon);
let failed = $derived(extension?.state === 'failed' && !!extension.error);
let section = $derived(failed ? view.state.section : 'readme');

let set = $derived.by(() => {
  if (extension) {
    return extensionActions(extension, app);
  }
  return entry ? catalogActions(entry, false) : undefined;
});

let pending = $derived(app.actions.pending(extensionKey(view.params.extensionId)));

// the README of the extension installed, else the one of the catalog (fetched, once)
let installedReadme = $derived(extension?.readme);
let catalogReadme = $derived(!installedReadme && !!entry?.readme);
const fetched = new AsyncValue<string>(() =>
  catalogReadme ? window.fetchCatalogReadme(view.params.extensionId) : undefined,
);
let readme = $derived(catalogReadme ? fetched.value : installedReadme);

function externalUrl(url: string): string {
  // the repository of a package.json can be prefixed with "git+"
  return url.startsWith('git+') ? url.slice(4) : url;
}

let repository = $derived.by(() => {
  const value = extension?.repository;
  const url = typeof value === 'string' ? value : value?.url;
  return url ? externalUrl(url) : undefined;
});

let details: KeyValue[] = $derived([
  { label: 'Version', value: `v${extension?.version ?? entry?.version ?? ''}` },
  ...(extension?.update ? [{ label: 'Update', value: `v${extension.update.version} available` }] : []),
  ...(entry?.lastUpdated
    ? [{ label: 'Released', value: new Date(entry.lastUpdated).toISOString().split('T')[0] ?? '' }]
    : []),
  ...(entry?.publisher ? [{ label: 'Published by', value: entry.publisher }] : []),
  ...(entry?.categories.length ? [{ label: 'Categories', value: entry.categories.join(', ') }] : []),
  ...(repository ? [{ label: 'Repository', value: repository, href: repository }] : []),
  ...(extension?.homepage ? [{ label: 'Homepage', value: extension.homepage, href: extension.homepage }] : []),
  ...(extension?.overrides
    ? [{ label: 'Replaces', value: `${extension.overrides.id} v${extension.overrides.version}` }]
    : []),
  ...(extension?.path ? [{ label: 'Location', value: extension.path, mono: true, copy: true }] : []),
]);

let autoUpdatable = $derived(!!extension && isAutoUpdatable(extension));
let updatingAutoUpdate = $state(false);

async function setAutoUpdate(enabled: boolean): Promise<void> {
  updatingAutoUpdate = true;
  try {
    await window.setExtensionAutoUpdate(view.params.extensionId, enabled);
  } catch (error: unknown) {
    toast.error('The automatic updates could not be changed', { description: errorMessage(error) });
  } finally {
    updatingAutoUpdate = false;
  }
}
</script>

<Page icon={PuzzleIcon} title={name} body="fill">
  {#snippet meta()}
    {#if extension}
      <StatusBadge status={extension.state} actionKey={extensionKey(extension.id)} />
      {#each extensionBadges(extension) as badge (badge)}
        <Badge variant="outline">{badge}</Badge>
      {/each}
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if failed}
      <SegmentedControl
        label="Section"
        bind:value={view.state.section}
        options={[
          { value: 'readme', label: 'Readme' },
          { value: 'error', label: 'Error' },
        ]} />
    {/if}
    {#if extension && set}
      <ExtensionActions {set} placement="header" />
    {:else if set?.actions[0] && !set.actions[0].hidden}
      {@const install = set.actions[0]}
      <!-- not installed: what the page is for -->
      <Button
        disabled={!!pending}
        onclick={(): void => {
          app.actions.run(set.target, install).catch(console.error);
        }}>
        {#if pending}
          <Spinner data-icon="inline-start" />
          Installing
        {:else}
          <DownloadIcon data-icon="inline-start" />
          Install
        {/if}
      </Button>
    {/if}
  {/snippet}
  {#if !extension && !entry}
    {#if app.extensions.loaded && app.catalog.loaded}
      <NotFound noun="Extension" />
    {/if}
  {:else if section === 'error'}
    <ScrollArea>
    <div class="flex flex-col gap-3 p-3">
      <Card title="The extension failed">
        <p class="text-state-error">{extension?.error?.message}</p>
        {#if extension?.error?.stack}
          <pre class="font-mono text-sm wrap-anywhere whitespace-pre-wrap text-muted-foreground">{extension.error.stack}</pre>
        {/if}
      </Card>
    </div>
    </ScrollArea>
  {:else}
    <!-- scrolls vertically only: what the README contains (an image, a code block) fits its width -->
    <ScrollArea>
    <div class="mx-auto flex w-full max-w-6xl flex-col-reverse items-start gap-3 p-3 lg:flex-row">
      <div class="w-full min-w-0 lg:flex-1">
        <Card title="Readme">
          {#if readme}
            <Markdown markdown={readme} />
          {:else if !fetched.loading}
            <p class="text-muted-foreground">This extension has no README.</p>
          {/if}
        </Card>
      </div>
      <div class="flex w-full min-w-0 shrink-0 flex-col gap-3 lg:w-72">
        <Card title="About">
          <div class="flex items-center gap-3">
            {#if icon}
              <ImageIcon {icon} class="size-8" />
            {/if}
            <p class="min-w-0 text-muted-foreground">{extension?.description ?? entry?.description}</p>
          </div>
          {#if autoUpdatable}
            <Field.Field orientation="horizontal">
              <Switch
                id="extension-auto-update"
                disabled={updatingAutoUpdate}
                checked={!extension?.autoUpdateDisabled}
                onCheckedChange={(checked): void => {
                  setAutoUpdate(checked).catch(console.error);
                }} />
              <Field.Label for="extension-auto-update">Update automatically</Field.Label>
            </Field.Field>
          {/if}
        </Card>
        <KeyValueCard title="Details" rows={details} stacked />
      </div>
    </div>
    </ScrollArea>
  {/if}
</Page>
