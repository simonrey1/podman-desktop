/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import {
  type CellData,
  columnFilteringFeature,
  type ColumnHelper,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  type RowData,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  type TableFeatures,
  tableFeatures,
} from '@tanstack/svelte-table';

/** The features of the resource tables: sorting, and filtering on the text of the columns. */
export const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime },
});

export type DataTableFeatures = typeof features;

export function columnHelper<T extends RowData>(): ColumnHelper<DataTableFeatures, T> {
  return createColumnHelper<DataTableFeatures, T>();
}

/* eslint-disable @typescript-eslint/no-unused-vars -- the type parameters must be those of the augmented interface */
declare module '@tanstack/table-core' {
  interface ColumnMeta<
    in out TFeatures extends TableFeatures,
    in out TData extends RowData,
    TValue extends CellData = CellData,
  > {
    /**
     * the width of the column, e.g. `6rem`: the widths do not depend on the rows (e.g. when filtering);
     * the columns without a width share the remaining width
     */
    width?: string;
    /** the actions of the rows: aligned at the end, shown when the row is hovered */
    actions?: boolean;
    /** classes of the content of the header and of the cells, e.g. the alignment */
    class?: string;
    /** classes of the content of the cells only, e.g. a monospace font */
    cellClass?: string;
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */
