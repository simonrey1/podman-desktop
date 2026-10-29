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

import type { ProviderContainerConnectionInfo } from '@desktop-framework/api';

import { errorMessage } from '#lib/stores/actions.svelte.js';

/** What to build. */
export interface BuildRequest {
  engineId: string;
  connection: ProviderContainerConnectionInfo;
  /** the absolute path of the Containerfile */
  containerfile: string;
  /** the directory sent to the engine */
  context: string;
  /** e.g. quay.io/namespace/image (none: an image without a name); for several platforms, the name of the manifest */
  imageName?: string;
  /** e.g. linux/amd64: several platforms build a manifest */
  platforms: string[];
  buildArgs: Record<string, string>;
  /** the stage of the Containerfile to build, else the last one */
  target?: string;
  validateRegistries: boolean;
}

function blankToUndefined(value: string | undefined): string | undefined {
  return value?.trim() === '' ? undefined : value?.trim();
}

/** the last line of a build output with the ID of the image built */
interface BuildOutputLine {
  aux?: { ID?: string };
}

/** A build, running or done: its output is kept for the sessions showing it, even opened later. */
export class Build {
  readonly id: string;
  readonly request: BuildRequest;
  readonly started = Date.now();
  status: 'running' | 'succeeded' | 'failed' | 'canceled' = $state('running');
  error: string | undefined = $state();
  /** the image built: its ID (for one platform), or the name of the manifest (for several) */
  imageId: string | undefined = $state();

  readonly #output: string[] = [];
  // eslint-disable-next-line svelte/prefer-svelte-reactivity -- the sessions writing the output, not a reactive state
  readonly #listeners = new Set<(data: string) => void>();
  #tokenId: number | undefined;

  constructor(id: string, request: BuildRequest) {
    this.id = id;
    this.request = request;
  }

  /** the output so far, then as it comes; @returns a function unsubscribing */
  onOutput(listener: (data: string) => void): () => void {
    for (const data of this.#output) {
      listener(data);
    }
    this.#listeners.add(listener);
    return (): void => {
      this.#listeners.delete(listener);
    };
  }

  #write(data: string): void {
    this.#output.push(data);
    for (const listener of this.#listeners) {
      listener(data);
    }
  }

  async run(): Promise<void> {
    const { request } = this;
    // the engine resolves the Containerfile in the context
    const containerfile = await window.pathRelative(request.context, request.containerfile);
    this.#tokenId = await window.getCancellableTokenSource();
    const key = Symbol(this.id);
    let streamError: string | undefined;
    const collect = (_key: symbol, event: 'error' | 'finish' | 'stream', data: string): void => {
      if (event === 'stream') {
        this.#write(data);
      } else if (event === 'error') {
        streamError = data;
        this.#write(`\r\n\x1b[31m${data}\x1b[0m\r\n`);
      }
    };
    const build = (platform: string, name: string | undefined): Promise<unknown> =>
      window.buildImage(
        request.context,
        containerfile,
        name,
        platform,
        $state.snapshot(request.connection),
        key,
        collect,
        this.#tokenId,
        request.buildArgs,
        undefined,
        request.target,
        request.validateRegistries,
      );
    const idOf = (output: unknown): string | undefined =>
      Array.isArray(output) ? (output as BuildOutputLine[]).find(line => line.aux?.ID)?.aux?.ID : undefined;
    try {
      if (request.platforms.length > 1) {
        // one image per platform, without a name, then a manifest of them named
        const images: string[] = [];
        for (const platform of request.platforms) {
          const id = idOf(await build(platform, undefined));
          if (id) {
            images.push(id.replace('sha256:', 'containers-storage:'));
          }
          if (streamError) {
            throw new Error(streamError);
          }
        }
        await window.createManifest({ images, name: request.imageName ?? '' });
        this.imageId = request.imageName;
      } else {
        this.imageId = idOf(await build(request.platforms[0] ?? '', request.imageName));
        if (streamError) {
          throw new Error(streamError);
        }
      }
      this.status = this.status === 'canceled' ? 'canceled' : 'succeeded';
    } catch (error: unknown) {
      if (this.status !== 'canceled') {
        this.status = 'failed';
        this.error = errorMessage(error);
      }
    } finally {
      this.#tokenId = undefined;
    }
  }

  async cancel(): Promise<void> {
    if (this.#tokenId !== undefined) {
      this.status = 'canceled';
      this.#write('\r\n\x1b[33mBuild canceled\x1b[0m\r\n');
      await window.cancelToken(this.#tokenId);
    }
  }
}

/**
 * The image builds started in this window: a build runs whether its form or its output are shown or not.
 */
export class BuildsStore {
  all: Build[] = $state([]);

  #next = 0;

  get(id: string): Build | undefined {
    return this.all.find(build => build.id === id);
  }

  start(request: BuildRequest): Build {
    // the fields left empty are not given
    const build = new Build(`build-${++this.#next}`, {
      ...request,
      imageName: blankToUndefined(request.imageName),
      target: blankToUndefined(request.target),
    });
    this.all.push(build);
    build.run().catch((error: unknown) => console.error(`Error building ${request.imageName}`, error));
    return build;
  }
}
