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

import type { App } from '#lib/app.svelte.js';
import { viewRef } from '#lib/views/index.js';

import RegistryLoginDialog from './RegistryLoginDialog.svelte';

/** the errors of a registry refusing an image without credentials */
const UNAUTHORIZED = ['unauthorized', 'authentication required', 'denied', 'requested access to the resource'];

/** the registry of an image: its first segment when it is a host (a dot, a colon, localhost), else Docker Hub */
export function registryOf(image: string): string {
  const [first = '', ...rest] = image.split('/');
  return rest.length && (first.includes('.') || first.includes(':') || first === 'localhost') ? first : 'docker.io';
}

/** A hint on an image refused by its registry: what to sign in to, and the action doing it. */
export interface SignInHint {
  description: string;
  action?: { label: string; onClick: () => void };
}

/**
 * The hint of a pull failed because the registry asks for credentials: the extension managing the registry when one
 * is recommended for it (its accounts are in the authentication settings), else signing in to the registry.
 * @returns undefined when the error is not about credentials
 */
export async function signInHint(app: App, image: string, error: string): Promise<SignInHint | undefined> {
  const message = error.toLowerCase();
  const recommended = (await window.getRecommendedRegistries().catch(() => [])).find(
    registry => image.includes(registry.id) && registry.errors.some(text => message.includes(text.toLowerCase())),
  );
  if (recommended) {
    if (!recommended.isInstalled) {
      return { description: `The ${recommended.name} extension manages ${recommended.id}: install it to sign in.` };
    }
    return {
      description: `Sign in with ${recommended.name} to pull from ${recommended.id}.`,
      action: {
        label: 'Sign in',
        onClick: (): void => app.workbench.open(viewRef('settings', {}), { state: { page: 'authentication' } }),
      },
    };
  }
  if (!UNAUTHORIZED.some(text => message.includes(text))) {
    return undefined;
  }
  const registry = registryOf(image);
  return {
    description: `${registry} asks for credentials to pull this image.`,
    action: { label: 'Sign in', onClick: (): void => app.modals.open(RegistryLoginDialog, { url: registry }) },
  };
}
