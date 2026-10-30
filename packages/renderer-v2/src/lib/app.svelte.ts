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

import { getContext, setContext } from 'svelte';

import { whenExtensionsStarted } from '#lib/api/events.js';
import { AuthenticationStore, CliToolsStore } from '#lib/stores/accessories.svelte.js';
import { ActionsStore } from '#lib/stores/actions.svelte.js';
import { BuildsStore } from '#lib/stores/builds.svelte.js';
import { ConfigurationStore } from '#lib/stores/configuration.svelte.js';
import { ConfirmationsStore } from '#lib/stores/confirmations.svelte.js';
import { ConnectionLogs } from '#lib/stores/connection-logs.js';
import { ContainersStore } from '#lib/stores/containers.svelte.js';
import { ContextStore } from '#lib/stores/context.svelte.js';
import { CreationsStore } from '#lib/stores/creations.svelte.js';
import { EnginesStore } from '#lib/stores/engines.svelte.js';
import { CatalogStore, DevelopmentFoldersStore, ExtensionsStore } from '#lib/stores/extensions.svelte.js';
import { ImageFilesProvidersStore } from '#lib/stores/image-files.svelte.js';
import { ImagesStore } from '#lib/stores/images.svelte.js';
import { MessageBoxesStore } from '#lib/stores/message-boxes.svelte.js';
import { ModalsStore } from '#lib/stores/modals.svelte.js';
import { NetworksStore } from '#lib/stores/networks.svelte.js';
import { NotificationsStore } from '#lib/stores/notifications.svelte.js';
import { PickersStore } from '#lib/stores/pickers.svelte.js';
import { PodsStore } from '#lib/stores/pods.svelte.js';
import { RegistriesStore } from '#lib/stores/registries.svelte.js';
import { SecretsStore } from '#lib/stores/secrets.svelte.js';
import { TasksStore } from '#lib/stores/tasks.svelte.js';
import { ThemeStore } from '#lib/stores/theme.svelte.js';
import { VolumesStore } from '#lib/stores/volumes.svelte.js';
import { NavigationHandler } from '#lib/workbench/navigation.js';
import { Workbench } from '#lib/workbench/workbench.svelte.js';

/**
 * The state of the application: one store per domain, each loaded from the main process and kept up to
 * date with its events. Provided to the components through a context (see {@link getApp}).
 */
export class App {
  readonly theme = new ThemeStore();
  readonly context = new ContextStore();
  readonly configuration = new ConfigurationStore(when => this.context.evaluate(when));
  readonly engines = new EnginesStore();
  readonly containers = new ContainersStore();
  readonly pods = new PodsStore();
  readonly images = new ImagesStore();
  readonly imageFilesProviders = new ImageFilesProvidersStore();
  readonly volumes = new VolumesStore();
  readonly secrets = new SecretsStore();
  readonly registries = new RegistriesStore();
  readonly authentication = new AuthenticationStore();
  readonly cliTools = new CliToolsStore();
  readonly networks = new NetworksStore();
  readonly confirmations = new ConfirmationsStore();
  readonly actions = new ActionsStore(this.confirmations);
  readonly messageBoxes = new MessageBoxesStore();
  readonly pickers = new PickersStore();
  readonly modals = new ModalsStore();
  readonly builds = new BuildsStore();
  readonly connectionLogs = new ConnectionLogs();
  readonly creations = new CreationsStore(this.engines);
  readonly tasks = new TasksStore(this.confirmations);
  readonly notifications = new NotificationsStore();

  readonly workbench = new Workbench({
    // the explorer shows the engine of the active view
    onActivate: (ref): void => {
      if ('engineId' in ref.params) {
        this.engines.select(ref.params.engineId);
      }
    },
  });
  readonly extensions = new ExtensionsStore();
  readonly catalog = new CatalogStore();
  readonly developmentFolders = new DevelopmentFoldersStore();
  readonly navigation = new NavigationHandler(this.workbench, this.engines, this.creations);

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
        this.context.setPlatform(platform);
      })
      .catch((error: unknown) => console.error('Error getting the platform and the version', error));

    const stops = [
      this.theme,
      this.context,
      this.configuration,
      this.messageBoxes,
      this.pickers,
      this.tasks,
      this.notifications,
      this.engines,
      this.containers,
      this.pods,
      this.images,
      this.imageFilesProviders,
      this.volumes,
      this.secrets,
      this.registries,
      this.authentication,
      this.cliTools,
      this.networks,
      this.extensions,
      this.catalog,
      this.developmentFolders,
      this.navigation,
    ].map(store => store.start());
    return (): void => {
      for (const stop of stops) {
        stop();
      }
    };
  }
}

// a key shared by every instance of this module: a hot reload of the dev server evaluates it again, and the components
// reloaded must still find the application set by the root
const APP_KEY = Symbol.for('podman-desktop.renderer-v2.app');

/** the application, set by the root component */
export function getApp(): App {
  const app = getContext<App | undefined>(APP_KEY);
  if (!app) {
    throw new Error('The application is not set: getApp() is called outside of the root component');
  }
  return app;
}

/** sets the application for the components under the root, @returns it */
export function setApp(app: App): App {
  return setContext(APP_KEY, app);
}
