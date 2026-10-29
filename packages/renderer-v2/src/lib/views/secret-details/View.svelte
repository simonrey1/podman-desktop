<script lang="ts">
import type { SecretInfo } from '@desktop-framework/api';
import KeyRoundIcon from '@lucide/svelte/icons/key-round';

import { getApp } from '#lib/app.svelte.js';
import { AsyncValue } from '#lib/async-value.svelte.js';
import CodeEditor from '#lib/components/editor/CodeEditor.svelte';
import EngineBadge from '#lib/components/engine/EngineBadge.svelte';
import KeyValueCard, { type KeyValue } from '#lib/components/KeyValueCard.svelte';
import NotFound from '#lib/components/NotFound.svelte';
import Page from '#lib/components/Page.svelte';
import SecretActions from '#lib/components/secret/SecretActions.svelte';
import SegmentedControl from '#lib/components/SegmentedControl.svelte';
import { age } from '#lib/format.js';
import { shortId } from '#lib/stores/containers.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

const app = getApp();

let secret = $derived(app.secrets.get(view.params.engineId, view.params.secretId));

// the inspect data has no secret data: the engines never send it back
const inspect = new AsyncValue<SecretInfo>(() =>
  view.state.section === 'inspect' ? window.inspectSecret(view.params.engineId, view.params.secretId) : undefined,
);

let details: KeyValue[] = $derived(
  secret
    ? [
        { label: 'Name', value: secret.Name },
        { label: 'ID', value: secret.Id, mono: true },
        { label: 'Engine', value: app.engines.label(secret.engineId, secret.engineName) },
        { label: 'Created', value: secret.CreatedAt ? `${age(secret.CreatedAt)} ago` : '' },
        { label: 'Updated', value: secret.UpdatedAt ? `${age(secret.UpdatedAt)} ago` : '' },
      ]
    : [],
);

let labels: KeyValue[] = $derived(Object.entries(secret?.Labels ?? {}).map(([label, value]) => ({ label, value })));
</script>

<Page
  icon={KeyRoundIcon}
  title={secret?.Name ?? shortId(view.params.secretId)}
  body={view.state.section === 'summary' ? 'scroll' : 'fill'}>
  {#snippet meta()}
    {#if secret}
      <EngineBadge engineId={view.params.engineId} />
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if secret}
      <SegmentedControl
        label="Section"
        bind:value={view.state.section}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'inspect', label: 'Inspect' },
        ]} />
      <SecretActions {secret} placement="header" />
    {/if}
  {/snippet}
  {#if secret}
    {#if view.state.section === 'summary'}
      <div class="grid grid-cols-1 gap-3 p-3 xl:grid-cols-2">
        <KeyValueCard title="Details" rows={details} />
        <KeyValueCard title="Labels ({labels.length})" rows={labels} empty="No labels" />
      </div>
    {:else}
      <CodeEditor language="json" value={inspect.value ? JSON.stringify(inspect.value, undefined, 2) : ''} />
    {/if}
  {:else if app.secrets.loaded}
    <NotFound noun="Secret" />
  {/if}
</Page>
