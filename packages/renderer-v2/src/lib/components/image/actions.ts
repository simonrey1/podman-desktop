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

import type { ImageInfo } from '@desktop-framework/api';
import Trash2Icon from '@lucide/svelte/icons/trash-2';

import { type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import { imageName } from '#lib/stores/images.svelte.js';

/**
 * The actions of an image: in its row, in the header of its details, and in the bulk actions.
 * @param used whether a container uses the image: it cannot be deleted then
 */
export function imageActions(image: ImageInfo, used: boolean): ResourceActionSet {
  return {
    target: { key: resourceKey('image', image.engineId, image.Id), name: imageName(image) },
    actions: [
      {
        label: 'Delete',
        progress: 'deleting',
        icon: Trash2Icon,
        destructive: true,
        disabled: used,
        run: (): Promise<void> => window.deleteImage(image.engineId, image.Id),
      },
    ],
  };
}
