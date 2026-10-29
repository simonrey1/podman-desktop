<script lang="ts">
import type { FilesystemNode } from '@desktop-framework/api';
import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
import type { ImageFile } from '@podman-desktop/api';
import { SvelteSet } from 'svelte/reactivity';

import { bytes } from '#lib/format.js';

import { isExecutable, linkTarget, modeString, visibleLines } from './file-tree.js';

interface Props {
  root: FilesystemNode<ImageFile>;
  /** the files of one layer: the files it removes are struck through */
  layerOnly?: boolean;
}

// the files of an image, as a tree: only the expanded directories are rendered (an image has thousands of files)
let { root, layerOnly = false }: Props = $props();

// the expanded directories, by path: kept when another layer is shown
const expanded = new SvelteSet<string>();

let lines = $derived(visibleLines(root, expanded));

function toggle(path: string): void {
  if (expanded.has(path)) {
    expanded.delete(path);
  } else {
    expanded.add(path);
  }
}
</script>

<div class="flex min-w-max flex-col font-mono text-sm" role="tree" aria-label="Files">
  {#each lines as line (line.path)}
    {@const file = line.node.data}
    {@const link = linkTarget(file)}
    {@const removed = layerOnly && line.node.hidden}
    <div
      class="flex h-6 items-center gap-3 px-2 hover:bg-muted/50"
      role="treeitem"
      aria-level={line.depth + 1}
      aria-selected="false"
      aria-expanded={line.directory ? expanded.has(line.path) : undefined}>
      <span class="w-24 shrink-0 text-muted-foreground">{file ? modeString(file) : ''}</span>
      <span class="w-20 shrink-0 text-right text-muted-foreground tabular-nums">{line.node.size ? bytes(line.node.size) : ''}</span>
      <span class="flex min-w-0 items-center gap-1 ps-(--indent)" style:--indent="{line.depth * 1.25}rem">
        {#if line.directory}
          <button
            type="button"
            class="flex items-center gap-1 rounded-sm text-files-directory outline-none focus-visible:ring-1 focus-visible:ring-ring"
            class:line-through={removed}
            aria-label="{expanded.has(line.path) ? 'Collapse' : 'Expand'} {line.path}"
            onclick={(): void => toggle(line.path)}>
            <ChevronRightIcon class={['size-3.5 transition-transform', expanded.has(line.path) && 'rotate-90']} />
            {line.node.name}
          </button>
        {:else}
          <span
            class={[
              'ps-4.5',
              removed && 'text-files-hidden line-through',
              !removed && link !== undefined && 'text-files-symlink',
              !removed && isExecutable(file) && 'text-files-executable',
            ]}>
            {line.node.name}{#if link !== undefined}<span class="text-muted-foreground"> → {link}</span>{/if}
          </span>
        {/if}
      </span>
    </div>
  {:else}
    <div class="px-2 py-4 text-muted-foreground">No files</div>
  {/each}
</div>
