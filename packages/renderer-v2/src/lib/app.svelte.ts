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

import { createContext } from 'svelte';

import { whenExtensionsStarted } from '#lib/api/events.js';
import { ActionsStore } from '#lib/stores/actions.svelte.js';
import { ConfirmationsStore } from '#lib/stores/confirmations.svelte.js';
import { ContainersStore } from '#lib/stores/containers.svelte.js';
import { EnginesStore } from '#lib/stores/engines.svelte.js';
import { ImagesStore } from '#lib/stores/images.svelte.js';
import { MessageBoxesStore } from '#lib/stores/message-boxes.svelte.js';
import { ModalsStore } from '#lib/stores/modals.svelte.js';
import { NetworksStore } from '#lib/stores/networks.svelte.js';
import { PickersStore } from '#lib/stores/pickers.svelte.js';
import { PodsStore } from '#lib/stores/pods.svelte.js';
import { TasksStore } from '#lib/stores/tasks.svelte.js';
import { ThemeStore } from '#lib/stores/theme.svelte.js';
import { VolumesStore } from '#lib/stores/volumes.svelte.js';
import { Workbench } from '#lib/workbench/workbench.svelte.js';

/**
 * The state of the application: one store per domain, each loaded from the main process and kept up to
 * date with its events. Provided to the components through a context (see {@link getApp}).
 */
export class App {
  readonly theme = new ThemeStore();
  readonly engines = new EnginesStore();
  readonly containers = new ContainersStore();
  readonly pods = new PodsStore();
  readonly images = new ImagesStore();
  readonly volumes = new VolumesStore();
  readonly networks = new NetworksStore();
  readonly confirmations = new ConfirmationsStore();
  readonly actions = new ActionsStore(this.confirmations);
  readonly messageBoxes = new MessageBoxesStore();
  readonly pickers = new PickersStore();
  readonly modals = new ModalsStore();
  readonly tasks = new TasksStore(this.confirmations);

  readonly workbench = new Workbench({
    // the explorer shows the engine of the active view
    onActivate: (ref): void => {
      if ('engineId' in ref.params) {
        this.engines.select(ref.params.engineId);
      }
    },
  });

  /** e.g. 'darwin', 'linux' or 'win32' */
  platform = $state('');
  version = $state('');

  start(): () => void {
    // the main process registers most of its handlers while starting: ask once the extensions are started
    whenExtensionsStarted()
      .then(() => Promise.all([window.getOsPlatform(), window.getPodmanDesktopVersion()]))
      .then(([platform, version]) => {
        this.platform = platform;
        this.version = version;
      })
      .catch((error: unknown) => console.error('Error getting the platform and the version', error));

    const stops = [
      this.theme,
      this.messageBoxes,
      this.pickers,
      this.tasks,
      this.engines,
      this.containers,
      this.pods,
      this.images,
      this.volumes,
      this.networks,
    ].map(store => store.start());
    return (): void => {
      for (const stop of stops) {
        stop();
      }
    };
  }
}

export const [getApp, setApp] = createContext<App>();
