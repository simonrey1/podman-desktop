<script lang="ts">
import DownloadIcon from '@lucide/svelte/icons/download';
import FolderPlusIcon from '@lucide/svelte/icons/folder-plus';
import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
import type { SortingState } from '@tanstack/svelte-table';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import DataTable from '#lib/components/data-table/DataTable.svelte';
import InstallExtensionDialog from '#lib/components/extension/InstallExtensionDialog.svelte';
import FilterInput from '#lib/components/FilterInput.svelte';
import Page from '#lib/components/Page.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import * as Empty from '#lib/components/ui/empty/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { catalogColumns, installedColumns, localColumns, type LocalFolder } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the extensions installed, the catalog and the folders of the extensions in development; the details of an extension
// are a tab of their own
const app = getApp();

// on by default: the sections and the installation can be disabled by a policy
const enabled = (id: string): boolean => app.configuration.value(id) !== false;
let catalogEnabled = $derived(enabled('extensions.catalog.enabled'));
let localEnabled = $derived(enabled('extensions.localExtensions.enabled'));
let customEnabled = $derived(enabled('extensions.customExtensions.enabled'));
let developmentMode = $derived(app.configuration.value('extensions.developmentMode') === true);

let section = $derived(
  (view.state.section === 'catalog' && !catalogEnabled) || (view.state.section === 'local' && !localEnabled)
    ? 'installed'
    : view.state.section,
);
let options = $derived([
  { value: 'installed' as const, label: 'Installed' },
  ...(catalogEnabled ? [{ value: 'catalog' as const, label: 'Catalog' }] : []),
  ...(localEnabled ? [{ value: 'local' as const, label: 'Local' }] : []),
]);

const installed = installedColumns(app);
const catalog = catalogColumns(app);
const local = localColumns();

let folders: LocalFolder[] = $derived(
  app.developmentFolders.items.map(folder => ({
    path: folder.path,
    extension: app.extensions.items.find(extension => extension.path === folder.path),
  })),
);

// each section has its own sort
function sortOf(id: string): { get: () => SortingState; set: (sort: SortingState) => void } {
  return {
    get: (): SortingState => view.state.sorts[id] ?? [],
    set: (sort: SortingState): void => {
      view.state.sorts[id] = sort;
    },
  };
}
const sorts = { installed: sortOf('installed'), catalog: sortOf('catalog'), local: sortOf('local') };

function open(id: string, options: { preview: boolean }): void {
  view.open(viewRef('extension-details', { extensionId: id }), options);
}

async function refreshCatalog(): Promise<void> {
  try {
    await window.refreshCatalogExtensions();
  } catch (error: unknown) {
    toast.error('The catalog could not be refreshed', { description: errorMessage(error) });
  }
}

async function addFolder(): Promise<void> {
  const [path] =
    (await window.openDialog({
      selectors: ['openDirectory'],
      openLabel: 'Select folder',
      title: 'Track a new extension folder',
    })) ?? [];
  if (path) {
    try {
      await window.trackExtensionFolder(path);
    } catch (error: unknown) {
      toast.error('The folder could not be added', { description: errorMessage(error) });
    }
  }
}

function openDevelopmentSetting(): void {
  app.workbench.open(viewRef('settings', {}), { state: { query: 'Development Mode' } });
}
</script>

<Page icon={PuzzleIcon} title="Extensions">
  <!-- left: the section and what belongs to it, right: what is the same in every section. Nothing moves when
       switching -->
  {#snippet meta()}
    <SegmentedControl label="Section" bind:value={view.state.section} {options} />
    {#if section === 'catalog'}
      <ActionButton
        icon={RefreshCwIcon}
        label="Refresh the catalog"
        onclick={(): void => {
          refreshCatalog().catch(console.error);
        }} />
    {:else if section === 'local' && developmentMode}
      <Button
        variant="outline"
        onclick={(): void => {
          addFolder().catch(console.error);
        }}>
        <FolderPlusIcon data-icon="inline-start" />
        Add a folder
      </Button>
    {/if}
  {/snippet}
  {#snippet actions()}
    <FilterInput bind:value={view.state.filter} placeholder="Filter extensions" />
    {#if customEnabled}
      <Button onclick={(): void => app.modals.open(InstallExtensionDialog, {})}>
        <DownloadIcon data-icon="inline-start" />
        Install custom
      </Button>
    {/if}
  {/snippet}
  {#if section === 'installed'}
    <DataTable
      data={app.extensions.items}
      columns={installed}
      filter={view.state.filter}
      bind:sort={sorts.installed.get, sorts.installed.set}
      getRowId={(extension): string => extension.id}
      onOpen={(extension, options): void => open(extension.id, options)} />
  {:else if section === 'catalog'}
    <DataTable
      data={app.catalog.items}
      columns={catalog}
      filter={view.state.filter}
      bind:sort={sorts.catalog.get, sorts.catalog.set}
      getRowId={(entry): string => entry.id}
      onOpen={(entry, options): void => open(entry.id, options)}>
      {#snippet empty()}
        {#if app.catalog.loaded}
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon"><PuzzleIcon /></Empty.Media>
              <Empty.Title>No extension in the catalog</Empty.Title>
              <Empty.Description>The catalog could not be read, or it is empty. Refresh it to try again.</Empty.Description>
            </Empty.Header>
          </Empty.Root>
        {/if}
      {/snippet}
    </DataTable>
  {:else if !developmentMode}
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon"><FolderPlusIcon /></Empty.Media>
        <Empty.Title>Local extensions need the development mode</Empty.Title>
        <Empty.Description>Enable it to load an extension from a folder, while it is developed.</Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button variant="outline" onclick={openDevelopmentSetting}>Open the setting</Button>
      </Empty.Content>
    </Empty.Root>
  {:else}
    <DataTable
      data={folders}
      columns={local}
      filter={view.state.filter}
      bind:sort={sorts.local.get, sorts.local.set}
      getRowId={(folder): string => folder.path}
      onOpen={(folder, options): void => {
        if (folder.extension) {
          open(folder.extension.id, options);
        }
      }}>
      {#snippet empty()}
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon"><FolderPlusIcon /></Empty.Media>
            <Empty.Title>No folder tracked</Empty.Title>
            <Empty.Description>Add the folder of an extension to load it while it is developed.</Empty.Description>
          </Empty.Header>
        </Empty.Root>
      {/snippet}
    </DataTable>
  {/if}
</Page>
