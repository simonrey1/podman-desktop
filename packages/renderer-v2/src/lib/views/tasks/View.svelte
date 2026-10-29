<script lang="ts">
import type { TaskInfo } from '@desktop-framework/api';
import CircleStopIcon from '@lucide/svelte/icons/circle-stop';
import EraserIcon from '@lucide/svelte/icons/eraser';
import ListChecksIcon from '@lucide/svelte/icons/list-checks';
import SquareArrowOutUpRightIcon from '@lucide/svelte/icons/square-arrow-out-up-right';
import XIcon from '@lucide/svelte/icons/x';

import { getApp } from '#lib/app.svelte.js';
import ActionButton from '#lib/components/ActionButton.svelte';
import DataTable from '#lib/components/data-table/DataTable.svelte';
import * as Empty from '#lib/components/ui/empty/index.js';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';
import type { ViewProps } from '#lib/workbench/define-view.js';

import { taskColumns } from './columns.js';
import type { schema } from './view.js';

let { view }: ViewProps<typeof schema> = $props();

// the tasks of the main process and of the extensions, the running ones first
const app = getApp();
const tasks = app.tasks;

let completed = $derived(tasks.all.filter(task => task.state === 'completed').length);

function actionsOf(task: TaskInfo): ResourceActionSet {
  return {
    target: { key: `task:${task.id}`, name: task.name },
    actions: [
      {
        // e.g. opening the image a pull downloaded
        label: task.action ?? 'View',
        icon: SquareArrowOutUpRightIcon,
        hidden: !task.action,
        run: (): void => tasks.view(task),
      },
      {
        label: 'Cancel',
        icon: CircleStopIcon,
        hidden: task.state !== 'running' || !task.cancellable,
        run: (): Promise<void> => tasks.cancel(task),
      },
      {
        label: 'Clear',
        icon: XIcon,
        hidden: task.state !== 'completed',
        run: (): void => tasks.clear(task),
      },
    ],
  };
}

const columns = taskColumns(actionsOf);

let rows = $derived(
  tasks.all.toSorted((a, b) => Number(b.state === 'running') - Number(a.state === 'running') || b.started - a.started),
);
</script>

<div class="flex h-full flex-col">
  <div class="bar h-tabs items-center gap-2 px-3">
    <ListChecksIcon class="size-4 shrink-0 text-muted-foreground" />
    <span class="font-medium">Tasks</span>
    <span class="text-muted-foreground">{tasks.running.length} running</span>
    <div class="ms-auto flex items-center gap-1">
      <ActionButton
        icon={EraserIcon}
        label="Clear the completed tasks"
        size="icon-xs"
        disabled={completed === 0}
        onclick={(): void => tasks.clearCompleted()} />
    </div>
  </div>
  <div class="min-h-0 flex-1 overflow-y-auto">
    <DataTable data={rows} {columns} getRowId={(task): string => task.id} bind:sort={view.state.sort}>
      {#snippet empty()}
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon">
              <ListChecksIcon />
            </Empty.Media>
            <Empty.Title>No tasks</Empty.Title>
            <Empty.Description>The pulls, pushes and builds show here while they run.</Empty.Description>
          </Empty.Header>
        </Empty.Root>
      {/snippet}
    </DataTable>
  </div>
</div>
