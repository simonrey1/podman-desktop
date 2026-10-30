<script lang="ts" generics="T extends RowData">
import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
import { type ColumnDef, createTable, FlexRender, type RowData, type SortingState } from '@tanstack/svelte-table';
import type { Snippet } from 'svelte';
import type { Attachment } from 'svelte/attachments';

import { Checkbox } from '#lib/components/ui/checkbox/index.js';
import * as Table from '#lib/components/ui/table/index.js';

import { type DataTableFeatures, features } from './data-table.js';
import { VirtualRows } from './virtual-rows.svelte.js';

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
  /** the rows of a group (e.g. the containers of a pod): a group shows when one of its rows matches the filter */
  getSubRows?: (row: T) => T[] | undefined;
  /** bindable: the groups collapsed (false), by id; the other groups are expanded */
  expanded?: Record<string, boolean>;
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
  getSubRows,
  expanded = $bindable({}),
}: Props = $props();

// the ids of the groups (the rows having rows)
let groupIds = $derived.by(() => {
  const ids: string[] = [];
  const visit = (rows: T[]): void => {
    for (const row of rows) {
      const subRows = getSubRows?.(row);
      if (subRows?.length) {
        ids.push(getRowId(row));
        visit(subRows);
      }
    }
  };
  visit(data);
  return ids;
});

// the table expects the groups expanded: every group not collapsed
let expandedGroups = $derived(Object.fromEntries(groupIds.filter(id => expanded[id] !== false).map(id => [id, true])));

const table = createTable({
  features,
  get data() {
    return data;
  },
  get columns() {
    return columns;
  },
  getRowId: row => getRowId(row),
  getSubRows: (row): T[] | undefined => getSubRows?.(row),
  // a group is shown when one of its rows matches, with its rows matching
  filterFromLeafRows: true,
  // the groups stay as the user left them when the rows change (by default, the table collapses them)
  autoResetExpanded: false,
  onExpandedChange: updater => {
    const next = typeof updater === 'function' ? updater(expandedGroups) : updater;
    // kept: the groups collapsed (true: every group expanded)
    const collapsed = Object.fromEntries(groupIds.filter(id => next !== true && !next[id]).map(id => [id, false]));
    if (JSON.stringify(collapsed) !== JSON.stringify(expanded)) {
      expanded = collapsed;
    }
  },
  globalFilterFn: 'includesString',
  state: {
    get globalFilter() {
      return filter;
    },
    get sorting() {
      return sort;
    },
    get expanded() {
      return expandedGroups;
    },
  },
  onSortingChange: updater => {
    sort = typeof updater === 'function' ? updater(sort) : updater;
  },
});

let rows = $derived(table.getRowModel().rows);

// only the rows in the scrolling viewport are rendered (and some around, to scroll without a blank), by the virtualizer
// of TanStack: a list of hundreds of rows renders as fast as a short one; spacers keep the height of the others
const OVERSCAN = 6;
let columnCount = $derived(columns.length + (selection ? 1 : 0));
// the scrolling viewport of the page, the distance from its top to the first row (the header above the rows), and the
// height of a row (the same for all, measured once rendered: the density of the theme may change it)
let viewport: HTMLElement | null = $state(null);
let scrollMargin = $state(0);
let rowHeight = $state(35);

const virtual = new VirtualRows(() => ({
  count: rows.length,
  scrollElement: viewport,
  scrollMargin,
  rowHeight,
  overscan: OVERSCAN,
  getItemKey: (index: number): string | number => rows[index]?.id ?? index,
}));

let items = $derived(virtual.items);
let shown = $derived(items.flatMap(item => (rows[item.index] ? [{ row: rows[item.index], index: item.index }] : [])));
let before = $derived(items[0] ? items[0].start - scrollMargin : 0);
let after = $derived(items.length ? virtual.totalSize - ((items.at(-1)?.end ?? 0) - scrollMargin) : 0);

/** what scrolls the rows: a scroll area of a page (its overflow is set once mounted), or an element scrolling by itself */
function scrollParent(body: HTMLElement): HTMLElement | undefined {
  const area = body.closest<HTMLElement>('[data-slot="scroll-area-viewport"]');
  if (area) {
    return area;
  }
  for (let element = body.parentElement; element; element = element.parentElement) {
    if (['auto', 'scroll'].includes(getComputedStyle(element).overflowY)) {
      return element;
    }
  }
  return undefined;
}

const windowed: Attachment<HTMLElement> = body => {
  const scroller = scrollParent(body);
  if (!scroller) {
    return;
  }
  // the rows start under the header of the table (and what is above it in the page)
  const measure = (): void => {
    scrollMargin = body.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const height = body.querySelector('tr[data-row]')?.getBoundingClientRect().height;
    if (height) {
      rowHeight = height;
    }
  };
  const resized = new ResizeObserver(measure);
  resized.observe(scroller);
  measure();
  viewport = scroller;
  // the first rows are rendered once the viewport is known: their height measured then
  const frame = requestAnimationFrame(measure);
  return (): void => {
    cancelAnimationFrame(frame);
    resized.disconnect();
    viewport = null;
  };
};

// the columns without a width keep at least 12rem (e.g. the names): narrower, the table scrolls horizontally
let minWidth = $derived(
  `calc(${[...(selection ? ['2.25rem'] : []), ...columns.map(column => column.meta?.width ?? '12rem')].join(' + ')})`,
);

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
  <div class="contents" style:--table-min-width={minWidth}>
    <Table.Root aria-rowcount={rows.length + 1}>
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
      <Table.Body {@attach windowed}>
        {#if before > 0}
          <tr aria-hidden="true">
            <td class="h-(--spacer) p-0" colspan={columnCount} style:--spacer="{before}px"></td>
          </tr>
        {/if}
        {#each shown as { row, index } (row.id)}
          <Table.Row
            data-row
            aria-rowindex={index + 2}
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
          <!-- no row in the window yet is not an empty list: the first rows wait for the viewport -->
          {#if rows.length === 0}
            <Table.Row>
              <Table.Cell colspan={columnCount}>
                {#if noMatch}
                  {@render noMatch()}
                {:else}
                  <div class="flex h-24 items-center justify-center text-muted-foreground">
                    No results for “{filter}”
                  </div>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/if}
        {/each}
        {#if after > 0}
          <tr aria-hidden="true">
            <td class="h-(--spacer) p-0" colspan={columnCount} style:--spacer="{after}px"></td>
          </tr>
        {/if}
      </Table.Body>
    </Table.Root>
  </div>
{/if}
