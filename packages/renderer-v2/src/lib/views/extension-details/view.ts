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

import PuzzleIcon from '@lucide/svelte/icons/puzzle';
import { z } from 'zod';

import { defineView } from '#lib/workbench/define-view.js';

export const schema = {
  params: z.object({ extensionId: z.string() }),
  state: z.object({ section: z.enum(['readme', 'error']).default('readme') }),
};

export default defineView({
  schema,
  icon: PuzzleIcon,
  title: (params, app) =>
    app.extensions.get(params.extensionId)?.displayName ??
    app.catalog.get(params.extensionId)?.displayName ??
    params.extensionId,
  context: () => 'Extension',
  location: 'editor',
  component: () => import('./View.svelte'),
});
