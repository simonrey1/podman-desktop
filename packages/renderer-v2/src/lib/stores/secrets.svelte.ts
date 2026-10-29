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

import type { SecretInfo } from '@desktop-framework/api';

import { PROVIDER_EVENTS } from '#lib/stores/engines.svelte.js';
import { ListState } from '#lib/stores/list.svelte.js';

/**
 * The secrets of every engine (Podman secrets, Docker swarm secrets): their data is never read back.
 */
export class SecretsStore extends ListState<SecretInfo> {
  constructor() {
    super(() => window.listSecrets(), ['secret-event', ...PROVIDER_EVENTS]);
  }

  ofEngine(engineId: string): SecretInfo[] {
    return this.items.filter(secret => secret.engineId === engineId);
  }

  get(engineId: string, id: string): SecretInfo | undefined {
    return this.items.find(secret => secret.engineId === engineId && secret.Id === id);
  }
}
