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

import type { HistoryInfo } from '@desktop-framework/api';

import { columnHelper } from '#lib/components/data-table/data-table.js';
import { age, bytes } from '#lib/format.js';

/** a layer of the history, with its position (the layers have no unique id) */
export type HistoryLayer = HistoryInfo & { index: number };

const column = columnHelper<HistoryLayer>();

/** The layers of an image, the most recent first. */
export const historyColumns = column.columns([
  column.accessor('CreatedBy', {
    header: 'Created by',
    // the shell form of the instruction, as `podman history` shows it
    cell: ({ getValue }) => getValue().replace(/^\/bin\/sh -c (#\(nop\) )?/, ''),
    meta: { cellClass: 'font-mono text-sm' },
  }),
  column.accessor('Size', {
    header: 'Size',
    cell: ({ getValue }) => bytes(getValue()),
    sortFn: 'basic',
    meta: { width: '6rem', class: 'text-right tabular-nums text-muted-foreground' },
  }),
  column.accessor('Created', {
    header: 'Age',
    cell: ({ getValue }) => age(getValue()),
    sortFn: 'basic',
    meta: { width: '7rem', class: 'text-right text-muted-foreground' },
  }),
]);
