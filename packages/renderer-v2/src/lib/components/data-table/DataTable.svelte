<script lang="ts" generics="T extends RowData">
import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
import { type ColumnDef, createTable, FlexRender, type RowData, type SortingState } from '@tanstack/svelte-table';
import type { Snippet } from 'svelte';

import { Checkbox } from '#lib/components/ui/checkbox/index.js';
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
  /** shown when no row matches the filter */
  noMatch?: Snippet;
  /**
   * bindable: the ids of the selected rows; when given, a first column of checkboxes selects the rows
   * (the header one selects the rows shown, e.g. the ones matching the filter)
   */
  selection?: Record<string, true>;
  /** whether a row can be selected, e.g. an image used by a container cannot be deleted */
  canSelect?: (row: T) => boolean;
}

let {
  data,
  columns,
  getRowId,
  filter = '',
  sort = $bindable([]),
  onOpen,
  empty,
  noMatch,
  selection = $bindable(),
  canSelect = (): boolean => true,
}: Props = $props();

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

// the rows shown that can be selected, for the checkbox of the header
let selectable = $derived(rows.filter(row => canSelect(row.original)));
let selectedShown = $derived(selection ? selectable.filter(row => selection?.[row.id]).length : 0);

function setSelected(ids: string[], selected: boolean): void {
  const next = { ...selection };
  for (const id of ids) {
    if (selected) {
      next[id] = true;
    } else {
      delete next[id];
    }
  }
  selection = next;
}

function stop(event: Event): void {
  // the checkboxes are in clickable rows: do not open the row
  event.stopPropagation();
}

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
          {#if selection}
            <Table.Head style="--column-width: 2.25rem">
              <div class="flex items-center">
                <Checkbox
                  aria-label="Select all"
                  disabled={selectable.length === 0}
                  checked={selectable.length > 0 && selectedShown === selectable.length}
                  indeterminate={selectedShown > 0 && selectedShown < selectable.length}
                  onCheckedChange={(checked): void => setSelected(selectable.map(row => row.id), !!checked)} />
              </div>
            </Table.Head>
          {/if}
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
          onkeydown={(event): void => onkeydown(event, row.original)}
          data-state={selection?.[row.id] ? 'selected' : undefined}>
          {#if selection}
            {@const enabled = canSelect(row.original)}
            <Table.Cell style="--column-width: 2.25rem">
              <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
              <div class="flex items-center" onclick={stop} ondblclick={stop}>
                <Checkbox
                  aria-label="Select the row"
                  disabled={!enabled}
                  checked={!!selection[row.id]}
                  onCheckedChange={(checked): void => setSelected([row.id], !!checked)} />
              </div>
            </Table.Cell>
          {/if}
          {#each row.getAllCells() as cell (cell.id)}
            {@const meta = cell.column.columnDef.meta}
            <Table.Cell style={meta?.width ? `--column-width: ${meta.width}` : undefined}>
              <div
                class={[
                  meta?.actions
                    ? 'flex justify-end opacity-0 group-hover/row:opacity-100 group-has-focus-visible/row:opacity-100'
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
          <Table.Cell colspan={columns.length + (selection ? 1 : 0)}>
            {#if noMatch}
              {@render noMatch()}
            {:else}
              <div class="flex h-24 items-center justify-center text-muted-foreground">No results for “{filter}”</div>
            {/if}
          </Table.Cell>
        </Table.Row>
      {/each}
    </Table.Body>
  </Table.Root>
{/if}
