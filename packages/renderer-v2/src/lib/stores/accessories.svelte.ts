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

import type { CliToolInfo } from '@desktop-framework/api';
import type { AuthenticationProviderInfo } from '@desktop-framework/api/authentication';

import { ListState } from '#lib/stores/list.svelte.js';

/** an icon given by an extension: an image, or one for each theme */
export type ImageSource = string | { light: string; dark: string };

/** the icon of the images of a provider (`images.icon`), when given */
export function iconOf(images: unknown): ImageSource | undefined {
  const icon = (images as { icon?: unknown } | undefined)?.icon;
  return typeof icon === 'string' || (typeof icon === 'object' && icon !== null && 'light' in icon)
    ? (icon as ImageSource)
    : undefined;
}

/** The authentication providers of the extensions (e.g. a Red Hat account): their accounts and sign-in requests. */
export class AuthenticationStore extends ListState<AuthenticationProviderInfo> {
  constructor() {
    super(
      async () => [...(await window.getAuthenticationProvidersInfo())],
      ['authentication-provider-update', 'extensions-started'],
    );
  }
}

/** The command-line tools of the extensions (e.g. kubectl, kind): their version, and the ones to install or update. */
export class CliToolsStore extends ListState<CliToolInfo> {
  constructor() {
    super(
      () => window.getCliToolInfos(),
      ['cli-tool-create', 'cli-tool-remove', 'cli-tool-change', 'extensions-started'],
    );
  }
}
