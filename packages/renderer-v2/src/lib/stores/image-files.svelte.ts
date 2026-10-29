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

import type { ImageFilesInfo } from '@desktop-framework/api';

import { ListState } from '#lib/stores/list.svelte.js';

/**
 * The providers of the files of the images, registered by extensions: they read the layers of an image (the Files
 * section of its details shows once there is one).
 */
export class ImageFilesProvidersStore extends ListState<ImageFilesInfo> {
  constructor() {
    super(() => window.getImageFilesProviders(), ['image-files-provider-update', 'image-files-provider-remove']);
  }
}
