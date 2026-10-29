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

import { toast } from 'svelte-sonner';

import type { App } from '#lib/app.svelte.js';
import { errorMessage } from '#lib/stores/actions.svelte.js';
import { viewRef } from '#lib/views/index.js';

/** a small image printing a message and exiting: the first container of an engine */
export const HELLO_IMAGE = 'quay.io/podman/hello:latest';

/** the pod of the first container, when started in a pod */
export const FIRST_POD = 'my-first-pod';

/**
 * Pulls the hello image on the engine, then runs a container of it: in a new pod `my-first-pod` when asked (Podman).
 * The progress and the result are in a toast, which opens the container (or the pod) once started.
 */
export async function runFirst(app: App, engineId: string, inPod: boolean): Promise<void> {
  const connection = app.engines.get(engineId)?.connection;
  if (!connection) {
    return;
  }
  const id = toast.loading(inPod ? `Starting ${FIRST_POD}` : `Running ${HELLO_IMAGE}`);
  try {
    await window.pullImage($state.snapshot(connection), HELLO_IMAGE, () => {});
    let podId: string | undefined;
    if (inPod) {
      podId = (await window.createPod({ name: FIRST_POD, provider: $state.snapshot(connection) })).Id;
    }
    const { id: containerId } = await window.createAndStartContainer(engineId, {
      Image: HELLO_IMAGE,
      ...(inPod ? { pod: FIRST_POD } : {}),
    });
    const ref = podId
      ? viewRef('pod-details', { engineId, podId })
      : viewRef('container-details', { engineId, containerId });
    toast.success(inPod ? `${FIRST_POD} started` : `${HELLO_IMAGE} started`, {
      id,
      action: { label: 'Open', onClick: (): void => app.workbench.open(ref) },
    });
  } catch (error: unknown) {
    toast.error(inPod ? `${FIRST_POD} could not start` : `${HELLO_IMAGE} could not run`, {
      id,
      description: errorMessage(error),
      duration: 8000,
    });
  }
}
