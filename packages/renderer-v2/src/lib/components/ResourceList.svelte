<script lang="ts" generics="T extends RowData">
import type { LucideIcon } from '@lucide/svelte';
import type { ColumnDef, RowData, SortingState } from '@tanstack/svelte-table';
import type { Snippet } from 'svelte';

import type { DataTableFeatures } from '#lib/components/data-table/data-table.js';
import DataTable from '#lib/components/data-table/DataTable.svelte';
import FilterInput from '#lib/components/FilterInput.svelte';
import Page from '#lib/components/Page.svelte';
import * as Empty from '#lib/components/ui/empty/index.js';

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
}: Props = $props();
</script>

<Page {icon} {title}>
  {#snippet actions()}
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
