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
import { SvelteMap } from 'svelte/reactivity';

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
      // an engine failing to list its volumes is reported without them
      async () => (await window.listVolumes(false)).flatMap(list => list.Volumes ?? []),
      ['volume-event', ...PROVIDER_EVENTS],
    );
  }

  // the sizes gathered, by engine and name: computing them is slow, they are gathered on demand
  readonly #sizes = new SvelteMap<string, number>();

  /** the size in bytes of the volume, once gathered */
  size(volume: VolumeInfo): number | undefined {
    return this.#sizes.get(`${volume.engineId}:${volume.Name}`);
  }

  /**
   * Gathers the sizes of the volumes of an engine: it computes the usage of its disk, which can take a while.
   * @throws when the engine does not report them
   */
  async gatherSizes(engineId: string): Promise<void> {
    const list = (await window.listVolumes(true)).find(list => list.engineId === engineId);
    if (!list?.Volumes) {
      throw new Error('The engine did not report the sizes of its volumes');
    }
    for (const volume of list.Volumes) {
      // -1: unknown
      if (volume.UsageData && volume.UsageData.Size >= 0) {
        this.#sizes.set(`${volume.engineId}:${volume.Name}`, volume.UsageData.Size);
      }
    }
    // the tables compute the values of their rows when their data changes: a new list shows the sizes
    this.items = [...this.items];
    // the tables compute the values of their rows when their data changes: a new list shows the sizes
    this.items = [...this.items];
  }

  ofEngine(engineId: string): VolumeInfo[] {
    return this.items.filter(volume => volume.engineId === engineId);
  }

  get(engineId: string, name: string): VolumeInfo | undefined {
    return this.items.find(volume => volume.engineId === engineId && volume.Name === name);
  }
}
