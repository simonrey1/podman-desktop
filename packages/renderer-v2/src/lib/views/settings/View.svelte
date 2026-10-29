<script lang="ts">
import ContainerIcon from '@lucide/svelte/icons/container';
import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
import GlobeIcon from '@lucide/svelte/icons/globe';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';
import ServerIcon from '@lucide/svelte/icons/server';
import SettingsIcon from '@lucide/svelte/icons/settings';
import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
import TerminalIcon from '@lucide/svelte/icons/terminal';

import { getApp } from '#lib/app.svelte.js';
import FilterInput from '#lib/components/FilterInput.svelte';
import Page from '#lib/components/Page.svelte';
import AuthenticationSettings from '#lib/components/settings/pages/AuthenticationSettings.svelte';
import CliToolsSettings from '#lib/components/settings/pages/CliToolsSettings.svelte';
import DockerCompatibilitySettings from '#lib/components/settings/pages/DockerCompatibilitySettings.svelte';
import ProxySettings from '#lib/components/settings/pages/ProxySettings.svelte';
import RegistriesSettings from '#lib/components/settings/pages/RegistriesSettings.svelte';
import { matchesSetting } from '#lib/components/settings/settings.js';
import SettingsList from '#lib/components/settings/SettingsList.svelte';
import * as Field from '#lib/components/ui/field/index.js';
import { ScrollArea } from '#lib/components/ui/scroll-area/index.js';
import { Switch } from '#lib/components/ui/switch/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the settings of Podman Desktop and of its extensions: a page per configuration section, and the pages of their own
const app = getApp();

// the pages of their own, after the sections
const PAGES = [
  { id: 'proxy', label: 'Proxy', icon: GlobeIcon, component: ProxySettings },
  { id: 'registries', label: 'Registries', icon: ServerIcon, component: RegistriesSettings },
  { id: 'authentication', label: 'Authentication', icon: KeyRoundIcon, component: AuthenticationSettings },
  { id: 'cli-tools', label: 'CLI tools', icon: TerminalIcon, component: CliToolsSettings },
  {
    id: 'docker-compatibility',
    label: 'Docker compatibility',
    icon: ContainerIcon,
    component: DockerCompatibilitySettings,
    // a page once enabled in the preferences
    setting: 'dockerCompatibility.enabled',
  },
];

// the pages shown: a page of a setting once it is enabled
let pages = $derived(PAGES.filter(own => !own.setting || !!app.configuration.value(own.setting)));
let sections = $derived(app.configuration.sections);
let experimental = $derived(app.configuration.experimental);
let page = $derived(view.state.page || (sections[0] ? `section:${sections[0].id}` : ''));
let query = $derived(view.state.query.trim());

// the settings of the page shown, or the ones matching the search in every section
let settings = $derived.by(() => {
  if (query) {
    return app.configuration.shown.filter(setting => matchesSetting(setting, query));
  }
  if (page.startsWith('section:')) {
    return app.configuration.of(page.substring('section:'.length));
  }
  return [];
});
let pageTitle = $derived.by(() => {
  if (page === 'experimental') {
    return 'Experimental';
  }
  const own = PAGES.find(item => item.id === page);
  if (own) {
    return own.label;
  }
  const id = page.substring('section:'.length);
  const section = sections.find(item => item.id === id);
  return section?.title ?? sections.flatMap(item => item.nodes).find(node => node.id === id)?.title ?? '';
});

// every experimental feature enabled: the switch of the page enables or disables them all
let allExperimental = $derived(
  experimental.length > 0 && experimental.every(setting => !!app.configuration.value(setting.id)),
);
let experimentalError: string | undefined = $state();

function enableAll(enabled: boolean): void {
  experimentalError = undefined;
  Promise.all(
    experimental
      .filter(setting => !!app.configuration.value(setting.id) !== enabled)
      .map(setting => app.configuration.update(setting, enabled ? {} : false)),
  ).catch((error: unknown) => {
    experimentalError = errorMessage(error);
  });
}

function show(next: string): void {
  view.state.page = next;
  view.state.query = '';
}
</script>

{#snippet entry(id: string, label: string, Icon: typeof SettingsIcon | undefined, nested = false)}
  <button
    type="button"
    class={[
      'flex h-7 w-full items-center gap-2 rounded-md px-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-ring',
      nested && 'ps-8',
      !query && page === id ? 'bg-accent font-medium text-accent-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
    ]}
    aria-current={!query && page === id ? 'page' : undefined}
    onclick={(): void => show(id)}>
    {#if Icon}<Icon class="size-4 shrink-0" />{/if}
    <span class="truncate">{label}</span>
  </button>
{/snippet}

<Page icon={SettingsIcon} title="Settings" body="fill">
  {#snippet actions()}
    <FilterInput bind:value={view.state.query} placeholder="Search the settings" />
  {/snippet}
  <div class="flex h-full min-h-0">
    <nav class="w-56 shrink-0 border-e" aria-label="Settings pages">
      <ScrollArea>
        <div class="flex flex-col gap-0.5 p-2">
          {#each pages as own (own.id)}
            {@render entry(own.id, own.label, own.icon)}
          {/each}
          <div class="my-1 border-t"></div>
          {#each sections as section (section.id)}
            {@render entry(`section:${section.id}`, section.title, SlidersHorizontalIcon)}
            {#if section.nodes.length > 1}
              {#each section.nodes as node (node.id)}
                {@render entry(`section:${node.id}`, node.title, undefined, true)}
              {/each}
            {/if}
          {/each}
          {#if experimental.length}
            <div class="my-1 border-t"></div>
            {@render entry('experimental', 'Experimental', FlaskConicalIcon)}
          {/if}
        </div>
      </ScrollArea>
    </nav>
    <div class="min-w-0 flex-1">
      <ScrollArea>
        <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
          {#if query}
            <h2 class="px-1 text-lg font-semibold">Settings matching “{query}”</h2>
            <SettingsList {settings} empty="No settings match “{query}”" />
          {:else if page === 'experimental'}
            <h2 class="px-1 text-lg font-semibold">{pageTitle}</h2>
            <div class="flex items-center gap-4 rounded-lg bg-card px-4 py-3">
              <Field.Field orientation="horizontal">
                <Field.Content>
                  <Field.Label for="settings-experimental-all">Enable all the experimental features</Field.Label>
                  <Field.Description>They may change or be removed in a next release.</Field.Description>
                </Field.Content>
                <Switch id="settings-experimental-all" checked={allExperimental} onCheckedChange={enableAll} />
              </Field.Field>
            </div>
            {#if experimentalError}
              <Field.Error>{experimentalError}</Field.Error>
            {/if}
            <SettingsList settings={experimental} fullLabel />
          {:else if PAGES.some(item => item.id === page)}
            {@const Own = PAGES.find(item => item.id === page)?.component}
            <h2 class="px-1 text-lg font-semibold">{pageTitle}</h2>
            <Own />
          {:else}
            <h2 class="px-1 text-lg font-semibold">{pageTitle}</h2>
            <SettingsList {settings} />
          {/if}
        </div>
      </ScrollArea>
    </div>
  </div>
</Page>
