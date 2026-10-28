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
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/language/json/json.worker?worker';

export type MonacoApi = typeof Monaco;

let loading: Promise<MonacoApi> | undefined;

/** Loads Monaco once, on first use: it is a large module, kept out of the initial bundle. */
export function loadMonaco(): Promise<MonacoApi> {
  loading ??= (async (): Promise<MonacoApi> => {
    self.MonacoEnvironment = {
      getWorker: (_moduleId: string, label: string): Worker =>
        label === 'json' ? new jsonWorker() : new editorWorker(),
    };
    return import('monaco-editor');
  })();
  return loading;
}

export const MONACO_THEME = 'podman-desktop';

/** Defines (or redefines, when the theme of Podman Desktop changes) the Monaco theme from the theme colors. */
export function applyMonacoTheme(monaco: MonacoApi, isDark: boolean): void {
  const background = getComputedStyle(document.documentElement).getPropertyValue('--pd-content-bg').trim();
  monaco.editor.defineTheme(MONACO_THEME, {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors: {
      // the editor is the body of the tab: same background as the other views
      ...(background ? { 'editor.background': background } : {}),
      focusBorder: '#00000000',
    },
  });
  monaco.editor.setTheme(MONACO_THEME);
}
