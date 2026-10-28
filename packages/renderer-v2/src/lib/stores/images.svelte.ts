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

import { PROVIDER_EVENTS } from '#lib/stores/engines.svelte.js';
import { ListState } from '#lib/stores/list.svelte.js';

/**
 * The images of every engine.
 */
export class ImagesStore extends ListState<ImageInfo> {
  constructor() {
    super(
      () => window.listImages(),
      [
        'image-pull-event',
        'image-remove-event',
        'image-tag-event',
        'image-untag-event',
        'image-build-event',
        'image-loadfromarchive-event',
        ...PROVIDER_EVENTS,
      ],
    );
  }

  ofEngine(engineId: string): ImageInfo[] {
    return this.items.filter(image => image.engineId === engineId);
  }
}

export function imageName(image: ImageInfo): string {
  return image.RepoTags?.find(repoTag => repoTag !== '<none>:<none>') ?? '<none>';
}

/** the repository and the tag of an image, e.g. `docker.io/library/nginx` and `latest` */
export function imageRepositoryAndTag(image: ImageInfo): { repository: string; tag: string } {
  const name = imageName(image);
  // a reference by digest (repository@sha256:...) has no tag
  const digest = name.indexOf('@');
  if (digest >= 0) {
    return { repository: name.substring(0, digest), tag: '' };
  }
  // the tag is after the last colon, unless this colon is the port of the registry
  const separator = name.lastIndexOf(':');
  if (separator < 0 || separator < name.lastIndexOf('/')) {
    return { repository: name, tag: '' };
  }
  return { repository: name.substring(0, separator), tag: name.substring(separator + 1) };
}
