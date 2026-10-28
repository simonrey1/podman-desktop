<script lang="ts" generics="T extends RowData">
import type { LucideIcon } from '@lucide/svelte';
import type { ColumnDef, RowData, SortingState } from '@tanstack/svelte-table';
import type { Snippet } from 'svelte';

import { getApp } from '#lib/app.svelte.js';
import type { DataTableFeatures } from '#lib/components/data-table/data-table.js';
import DataTable from '#lib/components/data-table/DataTable.svelte';
import FilterInput from '#lib/components/FilterInput.svelte';
import Page from '#lib/components/Page.svelte';
import PruneButton from '#lib/components/PruneButton.svelte';
import SelectionBar, { type BulkAction } from '#lib/components/SelectionBar.svelte';
import * as Empty from '#lib/components/ui/empty/index.js';
import type { ResourceActionSet } from '#lib/stores/actions.svelte.js';

interface Props {
  icon: LucideIcon;
  title: string;
  /** e.g. "images", for the empty state */
  noun: string;
  data: T[];
  columns: ColumnDef<DataTableFeatures, T>[];
  getRowId: (row: T) => string;
  onOpen?: (row: T, options: { preview: boolean }) => void;
  /** before the filter, e.g. a segmented control */
  filters?: Snippet;
  /** bindable: the text filtering the rows */
  filter?: string;
  /** bindable: the sort of the table */
  sort?: SortingState;
  /** bindable: the ids of the selected rows (no selection column when not given) */
  selection?: Record<string, true>;
  /** whether a row can be selected */
  canSelect?: (row: T) => boolean;
  /** the actions of a row, for the bulk actions */
  actionsOf?: (row: T) => ResourceActionSet;
  /** the labels of the row actions offered on the selected rows, in order: e.g. Start, Stop, Delete */
  bulk?: string[];
  /** the prune of the unused resources of the engine, in the header */
  prune?: ResourceActionSet;
  loaded: boolean;
}

// the page of a list of resources: header with the filter, then the table
let {
  icon,
  title,
  noun,
  data,
  columns,
  getRowId,
  onOpen,
  filters,
  loaded,
  filter = $bindable(''),
  sort = $bindable([]),
  selection = $bindable(),
  canSelect,
  actionsOf,
  bulk = [],
  prune,
}: Props = $props();

const app = getApp();

// the selected rows still listed (a deleted resource leaves the list, not the selection)
let selected = $derived(selection ? data.filter(row => selection?.[getRowId(row)]) : []);

// each bulk action applies to the selected rows having this action enabled (e.g. Stop: the running containers)
let bulkActions: BulkAction[] = $derived.by(() => {
  if (!actionsOf || selected.length === 0) {
    return [];
  }
  const actionsOfRow = actionsOf;
  const sets = selected.map(actionsOfRow);
  // the look of each bulk action, the hidden ones included: the buttons do not come and go with the selection
  const samples = sets.flatMap(set => set.actions);
  return bulk.flatMap(label => {
    const sample = samples.find(action => action.label === label);
    if (!sample) {
      return [];
    }
    const items = sets.flatMap(set => {
      const action = set.actions.find(
        candidate => candidate.label === label && !candidate.disabled && !candidate.hidden,
      );
      return action ? [{ target: set.target, action }] : [];
    });
    return [
      {
        label,
        icon: sample.icon,
        filled: sample.filled,
        destructive: sample.destructive,
        count: items.length,
        run: (): void => {
          app.actions
            .runAll(label, items, noun)
            // a cancelled confirmation keeps the selection
            .then(ran => {
              if (ran) {
                selection = {};
              }
            })
            .catch((error: unknown) => console.error(`Error running ${label} on the selection`, error));
        },
      },
    ];
  });
});
</script>

<Page {icon} {title}>
  {#snippet toolbar()}
    {#if selected.length > 0}
      <SelectionBar selected={selected.length} actions={bulkActions} onClear={(): unknown => (selection = {})} />
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if prune}
      <PruneButton {prune} />
    {/if}
    {@render filters?.()}
    <FilterInput bind:value={filter} placeholder="Filter {noun}" />
  {/snippet}
  <DataTable {data} {columns} {getRowId} {filter} bind:sort bind:selection {canSelect} {onOpen}>
    {#snippet empty()}
      {#if loaded}
        {@const Icon = icon}
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon">
              <Icon />
            </Empty.Media>
            <Empty.Title>No {noun}</Empty.Title>
          </Empty.Header>
        </Empty.Root>
      {/if}
    {/snippet}
  </DataTable>
</Page>
