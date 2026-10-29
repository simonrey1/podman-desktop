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

import type { Registry, RegistrySuggestedProvider } from '@podman-desktop/api';

import { ListState } from '#lib/stores/list.svelte.js';

const EVENTS = ['registry-register', 'registry-unregister', 'registry-update', 'extensions-started'];

/** the host of a registry, without its scheme: `https://quay.io` and `quay.io` are the same registry */
export function registryHost(url: string): string {
  return url
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

/** The registries signed in to (their credentials are used to pull and push), and the ones suggested by extensions. */
export class RegistriesStore extends ListState<Registry> {
  readonly suggested = new ListState<RegistrySuggestedProvider>(() => window.getImageSuggestedRegistries(), EVENTS);

  constructor() {
    super(async () => [...(await window.getImageRegistries())], EVENTS);
  }

  /** the suggestions not signed in to yet */
  readonly available: RegistrySuggestedProvider[] = $derived(
    this.suggested.items.filter(
      suggestion => !this.items.some(registry => registryHost(registry.serverUrl) === registryHost(suggestion.url)),
    ),
  );

  /** the suggestion of a registry, for its name and its icon */
  suggestionOf(registry: Registry): RegistrySuggestedProvider | undefined {
    return this.suggested.items.find(suggestion => registryHost(suggestion.url) === registryHost(registry.serverUrl));
  }

  override start(): () => void {
    const stop = super.start();
    const stopSuggested = this.suggested.start();
    return (): void => {
      stop();
      stopSuggested();
    };
  }
}
