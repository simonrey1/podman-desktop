<script lang="ts">
import EyeIcon from '@lucide/svelte/icons/eye';
import EyeOffIcon from '@lucide/svelte/icons/eye-off';
import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
import LockIcon from '@lucide/svelte/icons/lock';
import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import Markdown from '#lib/components/markdown/Markdown.svelte';
import { tooltip } from '#lib/components/tooltip/tooltip.svelte.js';
import { Badge } from '#lib/components/ui/badge/index.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import * as InputGroup from '#lib/components/ui/input-group/index.js';
import * as NativeSelect from '#lib/components/ui/native-select/index.js';
import { Switch } from '#lib/components/ui/switch/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import type { Setting } from '#lib/stores/configuration.svelte.js';

import { defaultValue, isModified, settingKind, settingLabel, validateNumber } from './settings.js';

interface Props {
  setting: Setting;
  /** the label is the id of the setting (e.g. on the experimental page, where the settings come from everywhere) */
  fullLabel?: boolean;
}

// a setting: its label, its description, the control of its type, written as it is changed
let { setting, fullLabel = false }: Props = $props();

const app = getApp();

let kind = $derived(settingKind(setting));
let value = $derived(app.configuration.value(setting.id));
let read = $derived(app.configuration.isRead(setting.id));
let disabled = $derived(!!setting.readonly || !!setting.locked);
let controlId = $derived(`setting-${setting.id}`);
let error: string | undefined = $state();
let showPassword = $state(false);

// what is typed: written once the typing pauses, kept while it is not valid
let draft: string | undefined = $state();
let timer: ReturnType<typeof setTimeout> | undefined;
let shownText = $derived(draft ?? (value === undefined || value === null ? '' : String(value)));
let numberError = $derived(kind === 'number' && draft !== undefined ? validateNumber(setting, draft) : undefined);

function write(next: unknown): void {
  error = undefined;
  app.configuration.update(setting, next).catch((err: unknown) => {
    error = errorMessage(err);
  });
}

function type(text: string): void {
  draft = text;
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (kind === 'number') {
      if (validateNumber(setting, text)) {
        return;
      }
      write(Number(text));
    } else {
      write(text);
    }
    draft = undefined;
  }, 600);
}

async function browse(): Promise<void> {
  const [path] =
    (await window.openDialog({
      title: settingLabel(setting),
      selectors: [kind === 'folder' ? 'openDirectory' : 'openFile'],
    })) ?? [];
  if (path) {
    write(path);
  }
}

function reset(): void {
  clearTimeout(timer);
  draft = undefined;
  write(defaultValue(setting));
}
</script>

{#if kind !== 'unsupported'}
  <div class="flex flex-col gap-2 py-3">
    <div class="flex items-start gap-4">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <div class="flex items-center gap-2">
          <label for={controlId} class="font-medium">{fullLabel ? setting.id : settingLabel(setting)}</label>
          {#if setting.locked}
            <span {@attach tooltip('This setting is managed by your organization')}>
              <Badge variant="outline"><LockIcon />Managed</Badge>
            </span>
          {/if}
          {#if setting.experimental}
            <Badge variant="outline"><FlaskConicalIcon />Experimental</Badge>
          {/if}
          {#if read && !disabled && isModified(setting, value)}
            <ActionButton icon={RotateCcwIcon} label="Reset to the default" size="icon-xs" onclick={reset} />
          {/if}
        </div>
        {#if setting.markdownDescription}
          <div class="text-muted-foreground"><Markdown markdown={setting.markdownDescription} /></div>
        {:else if setting.description}
          <p class="text-muted-foreground">{setting.description}</p>
        {/if}
        {#if setting.experimental?.githubDiscussionLink}
          {@const link = setting.experimental.githubDiscussionLink}
          <div>
            <Button
              variant="link"
              size="sm"
              onclick={(): void => {
                window.openExternal(link).catch(console.error);
              }}>
              Share feedback
            </Button>
          </div>
        {/if}
      </div>
      {#if kind === 'boolean'}
        <Switch
          id={controlId}
          {disabled}
          checked={!!value}
          onCheckedChange={(checked): void => write(setting.experimental ? (checked ? {} : false) : checked)} />
      {:else if kind === 'enum'}
        <div class="w-56 shrink-0">
          <NativeSelect.Root
            id={controlId}
            {disabled}
            value={String(value ?? '')}
            onchange={(event): void => write((event.currentTarget as HTMLSelectElement).value)}>
            {#each setting.enum ?? [] as option (option)}
              <NativeSelect.Option value={option}>{option}</NativeSelect.Option>
            {/each}
          </NativeSelect.Root>
        </div>
      {:else if kind === 'number'}
        <div class="w-32 shrink-0">
          <Input
            id={controlId}
            type="number"
            {disabled}
            min={setting.minimum}
            max={typeof setting.maximum === 'number' ? setting.maximum : undefined}
            step={setting.step ?? (setting.type === 'integer' ? 1 : undefined)}
            value={shownText}
            aria-invalid={!!numberError}
            oninput={(event): void => type(event.currentTarget.value)} />
        </div>
      {/if}
    </div>
    {#if kind === 'string' || kind === 'password'}
      <InputGroup.Root>
        <InputGroup.Input
          id={controlId}
          type={kind === 'password' && !showPassword ? 'password' : 'text'}
          {disabled}
          placeholder={setting.placeholder}
          value={shownText}
          oninput={(event): void => type(event.currentTarget.value)} />
        {#if kind === 'password'}
          <InputGroup.Addon align="inline-end">
            <InputGroup.Button
              size="icon-xs"
              aria-label={showPassword ? 'Hide' : 'Show'}
              onclick={(): void => {
                showPassword = !showPassword;
              }}>
              {#if showPassword}<EyeOffIcon />{:else}<EyeIcon />{/if}
            </InputGroup.Button>
          </InputGroup.Addon>
        {/if}
      </InputGroup.Root>
    {:else if kind === 'file' || kind === 'folder'}
      <InputGroup.Root>
        <InputGroup.Input
          id={controlId}
          {disabled}
          placeholder={setting.placeholder}
          value={shownText}
          oninput={(event): void => type(event.currentTarget.value)} />
        <InputGroup.Addon align="inline-end">
          <InputGroup.Button size="xs" {disabled} onclick={(): void => void browse().catch(console.error)}>
            <FolderOpenIcon data-icon="inline-start" />
            Browse
          </InputGroup.Button>
        </InputGroup.Addon>
      </InputGroup.Root>
    {/if}
    {#if numberError}
      <Field.Error>{numberError}</Field.Error>
    {:else if error}
      <Field.Error>{error}</Field.Error>
    {/if}
  </div>
{/if}
