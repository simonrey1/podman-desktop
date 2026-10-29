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

import FolderTreeIcon from '@lucide/svelte/icons/folder-tree';

import { defineView } from '#lib/workbench/define-view.js';

import { engineName, imageParams, imageTitle, noState } from '../shared.js';

// the layers read are kept while the tab is open, not after it is closed
export const schema = { params: imageParams, state: noState };

export default defineView({
  schema,
  icon: FolderTreeIcon,
  title: (params, app) => `Files of ${imageTitle(params, app)}`,
  context: engineName,
  location: 'editor',
  // reading the layers takes a while: they stay read while another tab is shown
  keepAlive: true,
  component: () => import('./View.svelte'),
});
