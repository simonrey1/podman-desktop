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

import ServerCogIcon from '@lucide/svelte/icons/server-cog';
import { z } from 'zod';

import { creationLabel } from '#lib/components/engine/connection-form.svelte.js';
import { defineView } from '#lib/workbench/define-view.js';

import { noState } from '../shared.js';

// the values of the form are not kept in its state: a closed form starts again from the defaults
export const schema = {
  params: z.object({ providerId: z.string(), kind: z.enum(['container', 'kubernetes', 'vm']) }),
  state: noState,
};

export default defineView({
  schema,
  icon: ServerCogIcon,
  title: (params, app) => {
    const provider = app.engines.providers.find(item => item.id === params.providerId);
    return provider ? `Create a ${creationLabel(provider, params.kind)}` : 'Create a resource';
  },
  context: (params, app) => app.engines.providers.find(item => item.id === params.providerId)?.name,
  location: 'editor',
  component: () => import('./View.svelte'),
});
