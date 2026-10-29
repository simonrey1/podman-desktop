<script lang="ts">
import type { CliToolInfo } from '@desktop-framework/api';
import ArrowUpCircleIcon from '@lucide/svelte/icons/circle-arrow-up';
import DownloadIcon from '@lucide/svelte/icons/download';
import TerminalIcon from '@lucide/svelte/icons/terminal';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import Card from '#lib/components/Card.svelte';
import ImageIcon from '#lib/components/ImageIcon.svelte';
import Markdown from '#lib/components/markdown/Markdown.svelte';
import { tooltip } from '#lib/components/tooltip/tooltip.svelte.js';
import { Button } from '#lib/components/ui/button/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';

// the command-line tools of the extensions: their version, installed, updated or removed by Podman Desktop
const app = getApp();

let tools = $derived(app.cliTools.items);
// the operation running on a tool, and the last error of each, by tool
let running: Record<string, string> = $state({});
let errors: Record<string, string> = $state({});

type Operation = 'install' | 'update' | 'uninstall';
const PROGRESS: Record<Operation, string> = { install: 'Installing', update: 'Updating', uninstall: 'Removing' };

async function run(tool: CliToolInfo, operation: Operation): Promise<void> {
  if (operation === 'uninstall') {
    const confirmed = await app.confirmations.ask({
      title: `Remove ${tool.displayName}`,
      message: `${tool.displayName} ${tool.version ?? ''} will be removed from ${tool.path ?? 'this computer'}.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
  }
  delete errors[tool.id];
  const key = Symbol(tool.id);
  // the last error logged: the reason of a failure
  let logged: string | undefined;
  const logger = (_key: symbol, event: 'log' | 'warn' | 'error' | 'finish', args: string[]): void => {
    if (event === 'error') {
      logged = args.join(' ');
    }
  };
  try {
    if (operation === 'install') {
      // the version is chosen in a picker of the main process
      const version = await window.selectCliToolVersionToInstall(tool.id);
      running[tool.id] = PROGRESS.install;
      await window.installCliTool(tool.id, version, key, logger);
    } else if (operation === 'update') {
      const version = tool.newVersion ?? (await window.selectCliToolVersionToUpdate(tool.id));
      running[tool.id] = PROGRESS.update;
      await window.updateCliTool(tool.id, key, version, logger);
    } else {
      running[tool.id] = PROGRESS.uninstall;
      await window.uninstallCliTool(tool.id, key, logger);
    }
    toast.success(
      `${tool.displayName} ${operation === 'uninstall' ? 'removed' : operation === 'install' ? 'installed' : 'updated'}`,
    );
  } catch (error: unknown) {
    const message = errorMessage(error);
    // closing the picker of the version cancels
    if (!message.toLowerCase().includes('cancel')) {
      errors[tool.id] = logged ?? message;
    }
  } finally {
    delete running[tool.id];
  }
}
</script>

<Card title="Command-line tools">
  {#if tools.length}
    <ul class="flex flex-col divide-y">
      {#each tools as tool (tool.id)}
        {@const icon = tool.extensionInfo.icon}
        <li class="flex flex-col gap-1.5 py-3">
          <div class="flex items-center gap-3">
            {#if icon}
              <ImageIcon {icon} label={tool.extensionInfo.label} />
            {:else}
              <TerminalIcon class="size-5 shrink-0 text-muted-foreground" />
            {/if}
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="truncate font-medium">{tool.displayName}</span>
              <span class="truncate text-sm text-muted-foreground" {@attach tooltip(tool.path)}>
                {[tool.version ?? 'Not installed', tool.path, `from ${tool.extensionInfo.label}`].filter(Boolean).join(' · ')}
              </span>
            </div>
            {#if running[tool.id]}
              <span class="flex items-center gap-2 text-muted-foreground"><Spinner />{running[tool.id]}</span>
            {:else}
              {#if tool.canUpdate && tool.version}
                <Button
                  variant={tool.newVersion ? 'default' : 'outline'}
                  size="sm"
                  onclick={(): void => {
                    run(tool, 'update').catch(console.error);
                  }}>
                  <ArrowUpCircleIcon data-icon="inline-start" />
                  {tool.newVersion ? `Update to ${tool.newVersion}` : 'Change the version'}
                </Button>
              {/if}
              {#if tool.canInstall && !tool.version}
                <Button
                  size="sm"
                  onclick={(): void => {
                    run(tool, 'install').catch(console.error);
                  }}>
                  <DownloadIcon data-icon="inline-start" />
                  Install
                </Button>
              {/if}
              {#if tool.canInstall && tool.version}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={(): void => {
                    run(tool, 'uninstall').catch(console.error);
                  }}>
                  <Trash2Icon data-icon="inline-start" />
                  Remove
                </Button>
              {/if}
            {/if}
          </div>
          {#if tool.description}
            <div class="ps-8 text-sm text-muted-foreground"><Markdown markdown={tool.description} /></div>
          {/if}
          {#if errors[tool.id]}
            <div class="ps-8"><Field.Error>{errors[tool.id]}</Field.Error></div>
          {/if}
        </li>
      {/each}
    </ul>
  {:else if app.cliTools.loaded}
    <p class="text-muted-foreground">No command-line tool: the extensions add them (e.g. kubectl, kind).</p>
  {/if}
</Card>
