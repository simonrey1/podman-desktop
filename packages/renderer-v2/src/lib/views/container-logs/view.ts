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

import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
import { z } from 'zod';

import { defineView } from '#lib/workbench/define-view.js';

import { containerParams, containerTitle } from '../shared.js';

export const schema = {
  params: containerParams,
  state: z.object({
    /** cleared at this time: the logs before are not shown */
    since: z.string().optional(),
  }),
};

export default defineView({
  schema,
  icon: ScrollTextIcon,
  title: containerTitle,
  context: () => 'Logs',
  location: 'panel',
  // the logs keep streaming while another session is shown
  keepAlive: true,
  // each click on Logs opens a new session
  instances: 'multiple',
  component: () => import('./View.svelte'),
});
