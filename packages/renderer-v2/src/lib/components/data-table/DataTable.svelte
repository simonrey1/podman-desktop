<script lang="ts" generics="T extends RowData">
import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
import { type ColumnDef, createTable, FlexRender, type RowData, type SortingState } from '@tanstack/svelte-table';
import type { Snippet } from 'svelte';

import * as Table from '#lib/components/ui/table/index.js';

import { type DataTableFeatures, features } from './data-table.js';

interface Props {
  data: T[];
  columns: ColumnDef<DataTableFeatures, T>[];
  getRowId: (row: T) => string;
  /** keeps the rows containing this text */
  filter?: string;
  /** bindable: the sort of the rows (e.g. kept in the state of the view) */
  sort?: SortingState;
  /** a single click opens the row as a preview, a double click or Enter opens it for good */
  onOpen?: (row: T, options: { preview: boolean }) => void;
  /** shown when there are no rows at all (and not because of the filter) */
  empty?: Snippet;
}

let { data, columns, getRowId, filter = '', sort = $bindable([]), onOpen, empty }: Props = $props();

const table = createTable({
  features,
  get data() {
    return data;
  },
  get columns() {
    return columns;
  },
  getRowId: row => getRowId(row),
  globalFilterFn: 'includesString',
  state: {
    get globalFilter() {
      return filter;
    },
    get sorting() {
      return sort;
    },
  },
  onSortingChange: updater => {
    sort = typeof updater === 'function' ? updater(sort) : updater;
  },
});

let rows = $derived(table.getRowModel().rows);

function onkeydown(event: KeyboardEvent, row: T): void {
  if (event.key === 'Enter') {
    onOpen?.(row, { preview: false });
  }
}
</script>

{#if data.length === 0 && empty}
  {@render empty()}
{:else}
  <Table.Root>
    <Table.Header>
      {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
        <Table.Row>
          {#each headerGroup.headers as header (header.id)}
            {@const sorted = header.column.getIsSorted()}
            {@const meta = header.column.columnDef.meta}
            <Table.Head style={meta?.width ? `--column-width: ${meta.width}` : undefined}>
              <div class={['truncate', meta?.class]}>
              {#if !header.isPlaceholder}
                {#if header.column.getCanSort()}
                  <button
                    class="inline-flex items-center gap-1 tracking-wide uppercase hover:text-foreground"
                    onclick={header.column.getToggleSortingHandler()}>
                    <FlexRender {header} />
                    {#if sorted === 'asc'}
                      <ArrowUpIcon class="size-3" />
                    {:else if sorted === 'desc'}
                      <ArrowDownIcon class="size-3" />
                    {/if}
                  </button>
                {:else}
                  <FlexRender {header} />
                {/if}
              {/if}
              </div>
            </Table.Head>
          {/each}
        </Table.Row>
      {/each}
    </Table.Header>
    <Table.Body>
      {#each rows as row (row.id)}
        <Table.Row
          tabindex={onOpen ? 0 : undefined}
          data-interactive={onOpen ? true : undefined}
          onclick={(): void => onOpen?.(row.original, { preview: true })}
          ondblclick={(): void => onOpen?.(row.original, { preview: false })}
          onkeydown={(event): void => onkeydown(event, row.original)}>
          {#each row.getAllCells() as cell (cell.id)}
            {@const meta = cell.column.columnDef.meta}
            <Table.Cell style={meta?.width ? `--column-width: ${meta.width}` : undefined}>
              <div
                class={[
                  meta?.actions
                    ? 'flex justify-end opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100'
                    : 'truncate',
                  meta?.class,
                  meta?.cellClass,
                ]}>
                <FlexRender {cell} />
              </div>
            </Table.Cell>
          {/each}
        </Table.Row>
      {:else}
        <Table.Row>
          <Table.Cell colspan={columns.length}>
            <div class="flex h-24 items-center justify-center text-muted-foreground">No results for “{filter}”</div>
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
{/if}
