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

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url));

// Experimental v2 renderer, loaded instead of packages/renderer when the
// 'rendererV2.enabled' experimental setting is enabled.
// A single page (index.html): the views are not routes, the workbench shows them in its tab groups.
export default defineConfig({
  mode: process.env['MODE'],
  root: PACKAGE_ROOT,
  // Electron loads the UI from file://: the assets are referenced with relative paths
  base: '',
  plugins: [tailwindcss(), svelte({ compilerOptions: { runes: true } })],
  build: {
    sourcemap: true,
    outDir: 'dist',
    assetsDir: '.',
    emptyOutDir: true,
  },
});
