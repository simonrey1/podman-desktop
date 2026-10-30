<script lang="ts">
import EyeIcon from '@lucide/svelte/icons/eye';
import EyeOffIcon from '@lucide/svelte/icons/eye-off';
import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
import LockIcon from '@lucide/svelte/icons/lock';
import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import ChoiceSelect from '#lib/components/ChoiceSelect.svelte';
import Markdown from '#lib/components/markdown/Markdown.svelte';
import { tooltip } from '#lib/components/tooltip/tooltip.svelte.js';
import { Badge } from '#lib/components/ui/badge/index.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import * as InputGroup from '#lib/components/ui/input-group/index.js';
import { Slider } from '#lib/components/ui/slider/index.js';
import { Switch } from '#lib/components/ui/switch/index.js';
import { bytes } from '#lib/format.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import type { Setting } from '#lib/stores/configuration.svelte.js';

import { defaultValue, isModified, settingKind, settingLabel, validateNumber } from './settings.js';

interface Props {
  setting: Setting;
  /** the label is the id of the setting (e.g. on the experimental page, where the settings come from everywhere) */
  fullLabel?: boolean;
  /**
   * a field of a form (e.g. the creation of a connection): its value, given; its changes, to `onChange`; not written
   * to the configuration
   */
  value?: unknown;
  onChange?: (value: unknown) => void;
}

// a setting: its label, its description, the control of its type, written as it is changed (or a field of a form)
let { setting, fullLabel = false, value: formValue, onChange }: Props = $props();

const app = getApp();

let kind = $derived(settingKind(setting));
let value = $derived(onChange ? formValue : app.configuration.value(setting.id));
let read = $derived(onChange ? true : app.configuration.isRead(setting.id));
// the resources of a connection (CPUs, memory, disk) bounded by the host: a slider
let slider = $derived(
  kind === 'number' &&
    typeof setting.maximum === 'number' &&
    ['cpu', 'memory', 'diskSize'].includes(setting.format ?? ''),
);
// the slider snaps its value to its step as soon as it is shown (e.g. a memory of 2046517248 bytes to 2000000000): only
// what the user moves is written, once released, the value shown while moving it
let sliding: number | undefined = $state();
let sliderTouched = false;
let sliderValue = $derived(sliding ?? Number(value ?? 0));
let sliderLabel = $derived(setting.format === 'cpu' ? `${sliderValue} CPUs` : bytes(sliderValue));
// a field of a form without a display name: its description is its label (e.g. "HTTP Port" for `….http.port`)
let describedByLabel = $derived(!!onChange && !setting.displayName && !!setting.description);
let label = $derived.by(() => {
  if (fullLabel) {
    return setting.id;
  }
  return describedByLabel ? (setting.description ?? '') : settingLabel(setting);
});
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
  if (onChange) {
    onChange(next);
    return;
  }
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
          <label for={controlId} class="font-medium">{label}</label>
          {#if setting.locked}
            <span {@attach tooltip('This setting is managed by your organization')}>
              <Badge variant="outline"><LockIcon />Managed</Badge>
            </span>
          {/if}
          {#if setting.experimental}
            <Badge variant="outline"><FlaskConicalIcon />Experimental</Badge>
          {/if}
          {#if read && !disabled && !onChange && isModified(setting, value)}
            <ActionButton icon={RotateCcwIcon} label="Reset to the default" size="icon-xs" onclick={reset} />
          {/if}
        </div>
        {#if setting.markdownDescription}
          <div class="text-muted-foreground"><Markdown markdown={setting.markdownDescription} /></div>
        {:else if setting.description && !describedByLabel}
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
          <ChoiceSelect
            id={controlId}
            {disabled}
            value={String(value ?? '')}
            options={(setting.enum ?? []).map(option => ({ value: option, label: option }))}
            onValueChange={(selected): void => write(selected)} />
        </div>
      {:else if slider}
        <div class="flex w-64 shrink-0 items-center gap-3">
          <!-- moved by the user (its pointer, its keys, seen before its thumb commits): only then its value is written -->
          <Slider
            type="single"
            id={controlId}
            onpointerdowncapture={(): void => {
              sliderTouched = true;
            }}
            onkeydowncapture={(): void => {
              sliderTouched = true;
            }}
            {disabled}
            min={setting.minimum ?? 0}
            max={typeof setting.maximum === 'number' ? setting.maximum : 0}
            step={setting.step ?? 1}
            value={Number(value ?? setting.minimum ?? 0)}
            onValueChange={(next: number): void => {
              if (sliderTouched) {
                sliding = next;
              }
            }}
            onValueCommit={(next: number): void => {
              if (sliderTouched) {
                sliding = undefined;
                write(next);
              }
            }} />
          <span class="w-20 shrink-0 text-right text-muted-foreground tabular-nums">{sliderLabel}</span>
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
