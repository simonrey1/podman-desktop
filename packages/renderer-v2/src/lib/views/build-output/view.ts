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

import HammerIcon from '@lucide/svelte/icons/hammer';
import { z } from 'zod';

import { defineView } from '#lib/workbench/define-view.js';

import { noState } from '../shared.js';

export const schema = { params: z.object({ buildId: z.string() }), state: noState };

export default defineView({
  schema,
  icon: HammerIcon,
  // the image built, when named
  title: (params, app) => app.builds.get(params.buildId)?.request.imageName ?? 'Build',
  context: () => 'Build',
  location: 'panel',
  // the output keeps coming while another session is shown
  keepAlive: true,
  component: () => import('./View.svelte'),
});
