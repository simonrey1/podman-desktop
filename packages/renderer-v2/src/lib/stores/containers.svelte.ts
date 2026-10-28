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

import type { ContainerInfo } from '@desktop-framework/api';

import { PROVIDER_EVENTS } from '#lib/stores/engines.svelte.js';
import { ListState } from '#lib/stores/list.svelte.js';

export const CONTAINER_EVENTS = [
  'container-created-event',
  'container-die-event',
  'container-init-event',
  'container-kill-event',
  'container-removed-event',
  'container-started-event',
  'container-stopped-event',
  ...PROVIDER_EVENTS,
] as const;

/**
 * The containers of every engine.
 */
export class ContainersStore extends ListState<ContainerInfo> {
  readonly running: number = $derived(this.items.filter(container => container.State === 'running').length);

  constructor() {
    super(() => window.listContainers(), CONTAINER_EVENTS);
  }

  ofEngine(engineId: string): ContainerInfo[] {
    return this.items.filter(container => container.engineId === engineId);
  }

  /** the containers created from an image */
  ofImage(engineId: string, imageId: string): ContainerInfo[] {
    return this.items.filter(container => container.engineId === engineId && container.ImageID === imageId);
  }

  get(engineId: string, id: string): ContainerInfo | undefined {
    return this.items.find(container => container.engineId === engineId && container.Id === id);
  }
}

export function containerName(container: ContainerInfo): string {
  return (container.Names[0] ?? container.Id.substring(0, 12)).replace(/^\//, '');
}

/** the published ports, e.g. ":8080, :8443" */
export function containerPorts(container: ContainerInfo): string {
  const ports = container.Ports?.map(port => port.PublicPort).filter(port => !!port) ?? [];
  return ports
    .filter((port, index) => ports.indexOf(port) === index)
    .map(port => `:${port}`)
    .join(', ');
}

export function shortId(id: string): string {
  return id.replace('sha256:', '').substring(0, 12);
}
