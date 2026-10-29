<script lang="ts">
import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
import XIcon from '@lucide/svelte/icons/x';
import { toast } from 'svelte-sonner';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import { Button } from '#lib/components/ui/button/index.js';
import * as Dialog from '#lib/components/ui/dialog/index.js';
import * as Field from '#lib/components/ui/field/index.js';
import { Input } from '#lib/components/ui/input/index.js';
import { Spinner } from '#lib/components/ui/spinner/index.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';

interface Props {
  /** the engine receiving the images */
  engineId: string;
  /** load: archives of images (podman save); import: archives of container filesystems (podman export), named */
  mode: 'load' | 'import';
  onClose: () => void;
}

// loads image archives, or imports container archives as images, on the engine
let { engineId, mode, onClose }: Props = $props();

const app = getApp();

const TEXT = {
  load: {
    title: 'Load images',
    description: 'From archives of images (saved with podman save or Save).',
    action: 'Load',
  },
  import: {
    title: 'Import containers',
    description: 'From archives of container filesystems (exported with podman export or Export), as images.',
    action: 'Import',
  },
};

let text = $derived(TEXT[mode]);
// the archives chosen, with the name of their image when imported
let archives: { path: string; name: string }[] = $state([]);
let running = $state(false);
let error: string | undefined = $state();

let valid = $derived(archives.length > 0 && (mode === 'load' || archives.every(archive => archive.name.trim())));

async function browse(): Promise<void> {
  const paths = await window.openDialog({
    title: `Choose the archives to ${text.action.toLowerCase()}`,
    selectors: ['multiSelections', 'openFile'],
  });
  for (const path of paths ?? []) {
    if (!archives.some(archive => archive.path === path)) {
      // the image takes the name of the file, without its extension
      const file = path.substring(path.lastIndexOf('/') + 1);
      archives.push({ path, name: file.includes('.') ? file.substring(0, file.lastIndexOf('.')) : file });
    }
  }
}

async function run(): Promise<void> {
  const connection = app.engines.get(engineId)?.connection;
  if (!connection) {
    error = 'The engine is not available';
    return;
  }
  running = true;
  error = undefined;
  const provider = $state.snapshot(connection);
  try {
    if (mode === 'load') {
      await window.loadImages({ provider, archives: archives.map(archive => archive.path) });
    } else {
      for (const archive of archives) {
        await window.importContainer({ provider, archivePath: archive.path, imageTag: archive.name.trim() });
      }
    }
    toast.success(
      `${archives.length} archive${archives.length > 1 ? 's' : ''} ${mode === 'load' ? 'loaded' : 'imported'}`,
    );
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
  <Dialog.Content size="md">
    <Dialog.Header>
      <Dialog.Title>{text.title}</Dialog.Title>
      <Dialog.Description>{text.description}</Dialog.Description>
    </Dialog.Header>
    <form
      class="contents"
      onsubmit={(event): void => {
        event.preventDefault();
        run().catch(console.error);
      }}>
      <Dialog.Body>
        <Field.Set>
          <Field.Legend variant="label">Archives</Field.Legend>
          {#if archives.length}
            <ul class="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
              {#each archives as archive, index (archive.path)}
                <li class="flex items-center gap-2">
                  <span class="min-w-0 flex-1 truncate text-muted-foreground" title={archive.path}>{archive.path}</span>
                  {#if mode === 'import'}
                    <div class="w-56 shrink-0">
                      <Input bind:value={archive.name} aria-label="Name of the image of {archive.path}" placeholder="quay.io/namespace/image" />
                    </div>
                  {/if}
                  <ActionButton icon={XIcon} label="Remove {archive.path}" size="icon-xs" onclick={(): unknown => archives.splice(index, 1)} />
                </li>
              {/each}
            </ul>
          {/if}
          <div>
            <Button variant="outline" size="sm" disabled={running} onclick={(): void => void browse().catch(console.error)}>
              <FolderOpenIcon data-icon="inline-start" />
              Browse
            </Button>
          </div>
        </Field.Set>
        {#if error}
          <Field.Error>{error}</Field.Error>
        {/if}
      </Dialog.Body>
      <Dialog.Footer>
        <Button variant="outline" disabled={running} onclick={onClose}>Cancel</Button>
        <Button type="submit" disabled={running || !valid}>
          {#if running}
            <Spinner data-icon="inline-start" />
          {/if}
          {text.action}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
