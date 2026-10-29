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

import type * as Monaco from 'monaco-editor';

import { Listeners, type SearchResults, type SearchTarget } from './search.js';

/**
 * Searches the text of a Monaco editor (case-insensitive), highlighting the matches with the colors of the editor
 * theme; Ctrl/Cmd+F asks for a search instead of opening the find widget of Monaco.
 */
export function editorSearch(monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor): SearchTarget {
  const results = new Listeners<[SearchResults]>();
  const findRequests = new Listeners<[]>();
  const highlights = editor.createDecorationsCollection();
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => findRequests.emit());

  let matches: Monaco.Range[] = [];
  let index = -1;

  function show(): void {
    highlights.set(
      matches.map((range, i) => ({
        range,
        options: { className: i === index ? 'currentFindMatch' : 'findMatch', stickiness: 1 },
      })),
    );
    const current = matches[index];
    if (current) {
      editor.setSelection(current);
      editor.revealRangeInCenterIfOutsideViewport(current);
    }
    results.emit({ index, count: matches.length });
  }

  return {
    find: (query, direction): void => {
      const model = editor.getModel();
      matches =
        model && query ? model.findMatches(query, false, false, false, null, false).map(match => match.range) : [];
      if (matches.length === 0) {
        index = -1;
      } else if (direction === 'incremental') {
        // the first match from the start of the selection: typing more characters keeps the same match
        const start = editor.getSelection()?.getStartPosition();
        const at = start ? matches.findIndex(range => !range.getStartPosition().isBefore(start)) : 0;
        index = Math.max(at, 0);
      } else {
        const step = direction === 'next' ? 1 : -1;
        index = ((index < 0 ? 0 : index + step) + matches.length) % matches.length;
      }
      show();
    },
    clear: (): void => {
      matches = [];
      index = -1;
      highlights.clear();
      results.emit({ index, count: 0 });
    },
    onResults: listener => results.add(listener),
    onFindRequest: listener => findRequests.add(listener),
  };
}
