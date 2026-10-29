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
import ArchiveIcon from '@lucide/svelte/icons/archive';
import ArrowUpFromLineIcon from '@lucide/svelte/icons/arrow-up-from-line';
import BrushCleaningIcon from '@lucide/svelte/icons/brush-cleaning';
import HistoryIcon from '@lucide/svelte/icons/history';
import PencilIcon from '@lucide/svelte/icons/pencil';
import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
import Trash2Icon from '@lucide/svelte/icons/trash-2';
import type { Uri } from '@podman-desktop/api';
import { toast } from 'svelte-sonner';

import type { App } from '#lib/app.svelte.js';
import { pruneKey, type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import { shortId } from '#lib/stores/containers.svelte.js';
import { imageName, imageRepositoryAndTag } from '#lib/stores/images.svelte.js';
import { viewRef } from '#lib/views/index.js';

import EditImageDialog from './EditImageDialog.svelte';
import PushImageDialog from './PushImageDialog.svelte';

/** asks where to save the image, then saves it as a `.tar` (`nginx.tar` for `docker.io/library/nginx:latest`) */
async function saveImage(image: ImageInfo): Promise<void> {
  const named = imageName(image) !== '<none>';
  const { repository } = imageRepositoryAndTag(image);
  const file = `${named ? repository.substring(repository.lastIndexOf('/') + 1) : shortId(image.Id)}.tar`;
  const target = await window.saveDialog({
    title: `Save ${named ? imageName(image) : shortId(image.Id)}`,
    defaultUri: { fsPath: file, path: file, scheme: 'file' } as Uri,
  });
  if (!target) {
    return;
  }
  await window.saveImages({
    images: [{ id: named ? imageName(image) : image.Id, engineId: image.engineId }],
    outputTarget: target.fsPath,
  });
  toast.success(`${named ? imageName(image) : shortId(image.Id)} saved`, { description: target.fsPath });
}

/** pulls the tags of the image again: an image already up to date is reported as such */
async function updateImage(image: ImageInfo): Promise<void> {
  const [result] = await window.updateImages([{ engineId: image.engineId, id: image.Id }]);
  if (result?.updated) {
    toast.success(`${imageName(image)} updated`);
  } else if (result) {
    toast.info(`${imageName(image)} not updated`, { description: result.message });
  }
}

/**
 * The actions of an image: in its row, in the header of its details, and in the bulk actions.
 * @param used whether a container uses the image: it cannot be deleted nor updated then
 */
export function imageActions(image: ImageInfo, used: boolean, app: App): ResourceActionSet {
  const { engineId, Id: imageId } = image;
  const named = imageName(image) !== '<none>';
  // a manifest lists images: deleting it keeps them
  if (image.isManifest) {
    return {
      target: { key: resourceKey('image', engineId, imageId), name: imageName(image) },
      actions: [
        {
          label: 'Delete',
          progress: 'deleting',
          icon: Trash2Icon,
          destructive: true,
          confirmation: {
            title: `Delete ${imageName(image)}`,
            message: `The manifest ${imageName(image)} will be permanently removed, not its images. This cannot be undone.`,
          },
          run: (): Promise<void> => window.removeManifest(engineId, imageId),
        },
        {
          label: 'Push',
          progress: 'pushing',
          icon: ArrowUpFromLineIcon,
          confirmation: {
            title: `Push ${imageName(image)}`,
            message: `The manifest ${imageName(image)} and its images will be pushed to its registry.`,
          },
          run: async (): Promise<void> => {
            await window.pushManifest({ name: imageName(image), destination: imageName(image) });
            toast.success(`${imageName(image)} pushed`);
          },
        },
      ],
    };
  }
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
      {
        label: 'Push',
        icon: ArrowUpFromLineIcon,
        // pushed by one of its names
        hidden: !named,
        run: (): void => app.modals.open(PushImageDialog, { image }),
      },
      {
        label: 'Edit',
        icon: PencilIcon,
        run: (): void => app.modals.open(EditImageDialog, { image }),
      },
      {
        label: 'History',
        icon: HistoryIcon,
        run: (): void =>
          app.workbench.open(viewRef('image-details', { engineId, imageId }), { state: { section: 'history' } }),
      },
      {
        label: 'Save',
        progress: 'saving',
        icon: ArchiveIcon,
        run: (): Promise<void> => saveImage(image),
      },
      {
        label: 'Update',
        progress: 'updating',
        icon: RefreshCwIcon,
        // pulled again by its name: an image without a name, or used by a container, cannot be
        hidden: !named,
        disabled: used,
        confirmation: {
          title: 'Update image',
          message: `The tags of ${imageName(image)} will be pulled again, to their latest build.`,
        },
        run: (): Promise<void> => updateImage(image),
      },
    ],
  };
}

/** The prunes of the images of an engine, in the header of the list: the unused images, or the untagged ones only. */
export function imagePrune(engineId: string, engineLabel: string): ResourceActionSet {
  return {
    target: { key: pruneKey('images', engineId), name: 'images' },
    actions: [
      {
        label: 'Prune unused',
        progress: 'pruning',
        icon: BrushCleaningIcon,
        destructive: true,
        confirmation: {
          title: 'Prune unused images',
          message: `The images of ${engineLabel} not used by a container will be permanently removed. This cannot be undone.`,
        },
        run: (): Promise<unknown> => window.pruneImages(engineId, true),
      },
      {
        label: 'Prune untagged',
        progress: 'pruning',
        icon: BrushCleaningIcon,
        destructive: true,
        confirmation: {
          title: 'Prune untagged images',
          message: `The untagged images of ${engineLabel} not used by a container will be permanently removed. This cannot be undone.`,
        },
        run: (): Promise<unknown> => window.pruneImages(engineId, false),
      },
    ],
  };
}
