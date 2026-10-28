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

import type { VolumeInfo } from '@desktop-framework/api';

import { PROVIDER_EVENTS } from '#lib/stores/engines.svelte.js';
import { ListState } from '#lib/stores/list.svelte.js';

/**
 * The volumes of every engine.
 */
export class VolumesStore extends ListState<VolumeInfo> {
  constructor() {
    super(
      // without the usage (sizes): the preload asks for it by default, and computing it fails for the whole engine
      // when one of its containers is broken
      async () => (await window.listVolumes(false)).flatMap(list => list.Volumes),
      ['volume-event', ...PROVIDER_EVENTS],
    );
  }

  ofEngine(engineId: string): VolumeInfo[] {
    return this.items.filter(volume => volume.engineId === engineId);
  }
}
