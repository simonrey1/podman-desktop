<script lang="ts">
import type * as Monaco from 'monaco-editor';
import type { Attachment } from 'svelte/attachments';

import { getApp } from '#lib/app.svelte.js';
import { editorSearch } from '#lib/components/search/editor-search.js';
import type { SearchTarget } from '#lib/components/search/search.js';

import { applyMonacoTheme, loadMonaco, MONACO_THEME } from './monaco.js';

interface Props {
  value: string;
  /** a Monaco language, e.g. `json` or `yaml` */
  language: string;
  readOnly?: boolean;
  /** bindable: the search of the text, for a search field (undefined while the editor loads) */
  search?: SearchTarget;
}

// a Monaco editor filling its parent, following the theme of Podman Desktop
// eslint-disable-next-line no-useless-assignment -- a bindable prop, written when the editor is created and disposed
let { value, language, readOnly = true, search = $bindable() }: Props = $props();

const app = getApp();
let editor: Monaco.editor.IStandaloneCodeEditor | undefined = $state.raw();

const monaco: Attachment<HTMLElement> = element => {
  let instance: Monaco.editor.IStandaloneCodeEditor | undefined;
  let disposed = false;
  loadMonaco()
    .then(api => {
      if (disposed) {
        return;
      }
      applyMonacoTheme(api, app.theme.isDark);
      instance = api.editor.create(element, {
        value,
        language,
        readOnly,
        theme: MONACO_THEME,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
        fontSize: 12,
        lineHeight: 20,
        padding: { top: 8 },
        renderLineHighlight: readOnly ? 'none' : 'line',
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6, useShadows: false },
      });
      editor = instance;
      search = editorSearch(api, instance);
    })
    .catch((error: unknown) => console.error('Error loading the editor', error));
  return (): void => {
    disposed = true;
    instance?.dispose();
    editor = undefined;
    search = undefined;
  };
};

// the value can change (e.g. the inspect data reloaded)
$effect(() => {
  if (editor && editor.getValue() !== value) {
    editor.setValue(value);
  }
});

// the theme of Podman Desktop can change at any time
$effect(() => {
  if (editor && app.theme.revision) {
    loadMonaco()
      .then(api => applyMonacoTheme(api, app.theme.isDark))
      .catch((error: unknown) => console.error('Error applying the editor theme', error));
  }
});
</script>

<div class="h-full w-full" {@attach monaco}></div>
