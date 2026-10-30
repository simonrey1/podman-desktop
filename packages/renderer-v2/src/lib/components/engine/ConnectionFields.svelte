<script lang="ts">
import SettingItem from '#lib/components/settings/SettingItem.svelte';
import * as Field from '#lib/components/ui/field/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';

import type { ConnectionForm } from './connection-form.svelte.js';

interface Props {
  form: ConnectionForm;
  providerName: string;
  disabled?: boolean;
}

// the fields of the form of a connection: the checks of the provider first (an error is why it cannot be created)
let { form, providerName, disabled = false }: Props = $props();
</script>

{#each form.audit as record, index (index)}
  {#if record.type === 'error'}
    <Field.Error>{record.record}</Field.Error>
  {:else}
    <p class={['text-sm', record.type === 'warning' ? 'text-state-warning' : 'text-muted-foreground']}>{record.record}</p>
  {/if}
{/each}
{#if form.error}
  <Field.Error>{form.error}</Field.Error>
{:else if !form.loaded}
  <div class="flex items-center gap-2 text-muted-foreground"><Spinner />Reading the settings</div>
{:else if form.fields.length === 0}
  <p class="text-muted-foreground">{providerName} has no settings for it.</p>
{:else}
  <fieldset class="flex flex-col divide-y" {disabled}>
    {#each form.fields as field (field.id)}
      <SettingItem
        setting={field}
        value={form.values[field.id]}
        onChange={(value): void => {
          form.values[field.id] = value;
        }} />
    {/each}
  </fieldset>
{/if}
