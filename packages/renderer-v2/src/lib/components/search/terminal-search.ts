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

import { SearchAddon } from '@xterm/addon-search';
import type { Terminal } from '@xterm/xterm';

import { Listeners, type SearchResults, type SearchTarget } from './search.js';

// #RRGGBB only (xterm): an amber readable on the dark and on the light terminals
const DECORATIONS = {
  matchBackground: '#7a6000',
  matchOverviewRuler: '#7a6000',
  activeMatchBackground: '#c79a00',
  activeMatchColorOverviewRuler: '#c79a00',
};

/** Searches the output of a terminal (its scrollback included), Ctrl/Cmd+F asking for a search. */
export function terminalSearch(terminal: Terminal): SearchTarget {
  const addon = new SearchAddon();
  terminal.loadAddon(addon);
  const results = new Listeners<[SearchResults]>();
  const findRequests = new Listeners<[]>();
  addon.onDidChangeResults(({ resultIndex, resultCount }) => results.emit({ index: resultIndex, count: resultCount }));
  terminal.attachCustomKeyEventHandler(event => {
    if (event.type === 'keydown' && event.key.toLowerCase() === 'f' && (event.ctrlKey || event.metaKey)) {
      findRequests.emit();
      return false;
    }
    return true;
  });
  return {
    find: (query, direction): void => {
      if (direction === 'previous') {
        addon.findPrevious(query, { decorations: DECORATIONS });
      } else {
        addon.findNext(query, { decorations: DECORATIONS, incremental: direction === 'incremental' });
      }
    },
    clear: (): void => {
      addon.clearDecorations();
      results.emit({ index: -1, count: 0 });
    },
    onResults: listener => results.add(listener),
    onFindRequest: listener => findRequests.add(listener),
  };
}
