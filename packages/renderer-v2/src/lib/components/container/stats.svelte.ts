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

import type { ContainerStatsInfo } from '@desktop-framework/api';

interface Target {
  engineId: string;
  containerId: string;
  running: boolean;
}

/** how long a container is running before its statistics are streamed, in ms */
const START_DELAY = 1000;

/**
 * The CPU and memory used by a running container, streamed by the engine while the component creating it is
 * mounted. Created in a component (it uses an effect): the stream follows the container given by `target`.
 */
export class ContainerStats {
  /** percentage of one CPU (above 100 when several are used); undefined until two samples are received */
  cpu: number | undefined = $state();
  /** bytes, without the page cache */
  memory: number | undefined = $state();
  memoryLimit: number | undefined = $state();

  // primitives: the effect below runs again when they change, not each time the list of the containers is reloaded
  readonly #engineId: string;
  readonly #containerId: string;
  readonly #running: boolean;

  constructor(target: () => Target) {
    this.#engineId = $derived(target().engineId);
    this.#containerId = $derived(target().containerId);
    this.#running = $derived(target().running);

    $effect(() => {
      const engineId = this.#engineId;
      const containerId = this.#containerId;
      this.cpu = undefined;
      this.memory = undefined;
      this.memoryLimit = undefined;
      if (!this.#running) {
        return;
      }
      let streamId: number | undefined;
      let stopped = false;
      // a container restarting in a loop is running for a moment only: streamed once it stays running
      const timer = setTimeout(() => {
        window
          .getContainerStats(engineId, containerId, stats => this.#update(stats))
          .then(id => {
            // the component may be gone before the stream starts
            if (stopped) {
              window.stopContainerStats(id).catch(console.error);
            } else {
              streamId = id;
            }
          })
          .catch((error: unknown) =>
            console.error(`Error getting the statistics of the container ${containerId}`, error),
          );
      }, START_DELAY);
      return (): void => {
        stopped = true;
        clearTimeout(timer);
        if (streamId !== undefined) {
          window.stopContainerStats(streamId).catch(console.error);
        }
      };
    });
  }

  #update(stats: ContainerStatsInfo): void {
    this.memory = stats.memory_stats.usage - (stats.memory_stats.stats?.cache ?? 0);
    this.memoryLimit = stats.memory_stats.limit;
    // the CPU used since the previous sample: the first sample has none
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats.system_cpu_usage ?? 0);
    const cpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    if (stats.precpu_stats.cpu_usage.total_usage && systemDelta > 0) {
      this.cpu = (cpuDelta / systemDelta) * cpus * 100;
    }
  }
}
