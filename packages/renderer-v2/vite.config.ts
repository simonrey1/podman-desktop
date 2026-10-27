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

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import adapterStatic from '@sveltejs/adapter-static';
import type { Adapter } from '@sveltejs/kit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(PACKAGE_ROOT, 'dist');
const ENTRY = 'index.html';

/**
 * adapter-static always writes root-absolute asset URLs (`/_app/...`) in the
 * SPA fallback page. Electron loads the renderer from file://, where those
 * resolve to the filesystem root, so rewrite them to be relative.
 * Chunks already import each other with relative paths.
 */
function electronAdapter(): Adapter {
  const base = adapterStatic({ pages: OUT_DIR, assets: OUT_DIR, fallback: ENTRY });
  return {
    ...base,
    name: 'adapter-electron',
    async adapt(builder): Promise<void> {
      await base.adapt(builder);
      const entry = join(OUT_DIR, ENTRY);
      const html = await readFile(entry, 'utf-8');
      await writeFile(entry, html.replaceAll('"/_app/', '"./_app/'));
    },
  };
}

// Experimental v2 renderer, loaded instead of packages/renderer when the
// 'rendererV2.enabled' experimental setting is enabled.
export default defineConfig({
  mode: process.env['MODE'],
  root: PACKAGE_ROOT,
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        runes: true,
      },
      // Electron loads the UI from file:// so there is no server to resolve
      // pathname routes: use the hash router and emit a single SPA entry.
      router: { type: 'hash' },
      adapter: electronAdapter(),
    }),
  ],
});
