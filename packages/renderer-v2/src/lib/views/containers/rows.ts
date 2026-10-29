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

import type { ContainerInfo, PodInfo } from '@desktop-framework/api';

import type { App } from '#lib/app.svelte.js';
import { COMPOSE_PROJECT_LABEL, composeActions } from '#lib/components/compose/actions.js';
import { containerActions } from '#lib/components/container/actions.js';
import { podActions } from '#lib/components/pod/actions.js';
import { type ResourceActionSet, resourceKey } from '#lib/stores/actions.svelte.js';
import { containerName, containerPorts } from '#lib/stores/containers.svelte.js';

/**
 * A row of the containers list: a container, or a group of containers (the containers of a pod or of a Compose
 * project) with its own status and actions.
 */
export interface ContainerRow {
  /** the ID of a container (the selection keeps it), `pod:...` or `compose:...` for a group */
  id: string;
  name: string;
  status: string;
  /** muted, after the name: the published ports of a container, the kind and the size of a group */
  detail: string;
  actions: ResourceActionSet;
  /** in seconds */
  created: number;
  /** a running container: when it started */
  startedAt?: string;
  image?: string;
  container?: ContainerInfo;
  /** a pod group: its pod, once the pods are loaded */
  pod?: PodInfo;
  /** the containers of a group */
  children?: ContainerRow[];
  /** a container of a group: the name of the group (filtering on it shows its containers) */
  group?: string;
}

function containerRow(container: ContainerInfo, app: App): ContainerRow {
  return {
    id: container.Id,
    name: containerName(container),
    status: container.State,
    detail: containerPorts(container),
    actions: containerActions(container, app),
    created: container.Created,
    startedAt: container.State === 'running' ? container.StartedAt : undefined,
    image: container.Image,
    container,
  };
}

function containersCount(count: number): string {
  return `${count} container${count > 1 ? 's' : ''}`;
}

/** the status of a group from its containers: running when they all run, degraded when some do */
function groupStatus(running: number, total: number): string {
  if (running === total) {
    return 'running';
  }
  return running ? 'degraded' : 'exited';
}

interface Group {
  row: ContainerRow;
  engineId: string;
  project?: string;
  pod?: { id: string; name: string };
}

/** completes a group once its containers are known: its status, its age and its actions */
function completeGroup({ row, engineId, project, pod: podRef }: Group, app: App): void {
  const children = row.children ?? [];
  const running = children.filter(child => child.status === 'running').length;
  row.created = Math.min(...children.map(child => child.created));
  row.detail = `${project ? 'Compose' : 'Pod'} · ${containersCount(children.length)}`;
  if (project) {
    row.status = groupStatus(running, children.length);
    row.actions = composeActions(engineId, project, running, children.length);
  } else if (podRef) {
    row.pod = app.pods.get(engineId, podRef.id);
    row.status = row.pod?.Status ?? groupStatus(running, children.length);
    row.actions = row.pod
      ? podActions(row.pod, app)
      : { target: { key: resourceKey('pod', engineId, podRef.id), name: podRef.name }, actions: [] };
  }
}

/**
 * The rows of the containers list: the containers of a Compose project, else of a pod, are grouped (where their first
 * container is); the other containers are rows of their own.
 */
export function containerRows(containers: ContainerInfo[], app: App): ContainerRow[] {
  const rows: ContainerRow[] = [];
  const groups: Record<string, Group> = {};
  for (const container of containers) {
    const row = containerRow(container, app);
    const project = container.Labels?.[COMPOSE_PROJECT_LABEL];
    const podRef = project ? undefined : container.pod;
    let id: string | undefined;
    if (project) {
      id = `compose:${container.engineId}:${project}`;
    } else if (podRef) {
      id = `pod:${container.engineId}:${podRef.id}`;
    }
    if (!id) {
      rows.push(row);
      continue;
    }
    let group = groups[id];
    if (!group) {
      group = {
        row: {
          id,
          name: project ?? podRef?.name ?? '',
          status: '',
          detail: '',
          actions: row.actions,
          created: 0,
          children: [],
        },
        engineId: container.engineId,
        project,
        pod: podRef,
      };
      groups[id] = group;
      rows.push(group.row);
    }
    group.row.children?.push({ ...row, group: group.row.name });
  }
  for (const group of Object.values(groups)) {
    completeGroup(group, app);
  }
  return rows;
}
