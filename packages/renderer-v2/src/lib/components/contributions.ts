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

import type {
  ContainerInfo,
  ImageInfo,
  NetworkInspectInfo,
  PodInfo,
  ProviderContainerConnectionInfo,
  SecretInfo,
  VolumeInfo,
} from '@desktop-framework/api';
import { MenuContext } from '@desktop-framework/api';
import PuzzleIcon from '@lucide/svelte/icons/puzzle';

import type { App } from '#lib/app.svelte.js';
import type { ResourceAction } from '#lib/stores/actions.svelte.js';
import { containerName } from '#lib/stores/containers.svelte.js';
import { imageName, imageRepositoryAndTag } from '#lib/stores/images.svelte.js';

type Arg = Record<string, unknown>;

/*
 * What the commands of the extensions receive, and what their `when` clauses read: the fields of the objects of the
 * pages of renderer v1, which the extensions were written against, over the fields of the resource.
 */

function containerArg(container: ContainerInfo): Arg {
  return {
    ...container,
    id: container.Id,
    shortId: container.Id.substring(0, 8),
    name: containerName(container),
    image: container.Image,
    state: container.State?.toUpperCase(),
    startedAt: container.StartedAt,
    engineId: container.engineId,
    engineName: container.engineName,
    engineType: container.engineType,
    command: container.Command,
    created: container.Created,
    labels: container.Labels,
    imageBase64RepoTag: container.ImageBase64RepoTag,
    imageId: container.ImageID,
    names: container.Names,
  };
}

function imageArg(image: ImageInfo): Arg {
  const name = imageName(image);
  const { repository, tag } = imageRepositoryAndTag(image);
  return {
    ...image,
    id: image.Id,
    shortId: image.Id.replace('sha256:', '').substring(0, 12),
    name: name === '<none>' ? '<none>' : repository,
    tag,
    engineId: image.engineId,
    engineName: image.engineName,
    createdAt: image.Created,
    size: image.Size,
    base64RepoTag: btoa(name),
    labels: image.Labels,
    isManifest: image.isManifest,
    digest: image.Digest,
  };
}

function podArg(pod: PodInfo): Arg {
  return {
    ...pod,
    id: pod.Id,
    shortId: pod.Id.substring(0, 12),
    name: pod.Name,
    engineId: pod.engineId,
    engineName: pod.engineName,
    status: pod.Status?.toUpperCase(),
    created: pod.Created,
    containers: pod.Containers,
  };
}

function volumeArg(volume: VolumeInfo): Arg {
  return {
    ...volume,
    name: volume.Name,
    mountPoint: volume.Mountpoint,
    scope: volume.Scope,
    driver: volume.Driver,
    created: volume.CreatedAt,
    size: volume.UsageData?.Size ?? -1,
    engineId: volume.engineId,
    engineName: volume.engineName,
    status: volume.containersUsage?.length ? 'USED' : 'UNUSED',
    containersUsage: volume.containersUsage,
    labels: volume.Labels,
    options: volume.Options ?? undefined,
  };
}

function networkArg(network: NetworkInspectInfo): Arg {
  return {
    ...network,
    id: network.Id,
    shortId: network.Id.substring(0, 12),
    name: network.Name,
    driver: network.Driver,
    created: network.Created,
    engineId: network.engineId,
    engineName: network.engineName,
    engineType: network.engineType,
    labels: network.Labels,
    options: network.Options,
  };
}

/** the actions of the extensions for a resource: the `when` clauses hold on its fields, as `<prefix>:<field>`, or on `extra` */
function contributions(
  app: App,
  context: MenuContext,
  prefix: string,
  arg: () => Arg,
  extra: () => Record<string, unknown> = (): Record<string, unknown> => ({}),
): ResourceAction[] {
  const menus = app.menus.of(context);
  if (menus.length === 0) {
    return [];
  }
  const read = (key: string): unknown => {
    const local = extra()[key];
    if (local !== undefined) {
      return local;
    }
    return key.startsWith(`${prefix}:`) ? arg()[key.substring(prefix.length + 1)] : undefined;
  };
  return menus
    .filter(menu => app.context.evaluate(menu.when, read))
    .map(menu => ({
      label: menu.title,
      icon: PuzzleIcon,
      disabled: !!menu.disabled && app.context.evaluate(menu.disabled, read),
      // what crosses to the main process: no function, no reactive proxy
      run: (): Promise<unknown> => window.executeCommand(menu.command, JSON.parse(JSON.stringify(arg()))),
    }));
}

/** the actions of a resource, then the ones of the extensions (a label is shown once) */
function merged(actions: ResourceAction[], contributed: ResourceAction[]): ResourceAction[] {
  const labels = new Set(actions.map(action => action.label));
  return [
    ...actions,
    ...contributed.filter(action => {
      const known = labels.has(action.label);
      labels.add(action.label);
      return !known;
    }),
  ];
}

export function withContainerContributions(
  actions: ResourceAction[],
  container: ContainerInfo,
  app: App,
): ResourceAction[] {
  return merged(
    actions,
    contributions(
      app,
      MenuContext.DASHBOARD_CONTAINER,
      'containerItem',
      () => containerArg(container),
      () => ({ containerImageName: container.Image }),
    ),
  );
}

export function withImageContributions(actions: ResourceAction[], image: ImageInfo, app: App): ResourceAction[] {
  return merged(
    actions,
    contributions(
      app,
      MenuContext.DASHBOARD_IMAGE,
      'imageItem',
      () => imageArg(image),
      () => ({ imageLabelKeys: Object.keys(image.Labels ?? {}) }),
    ),
  );
}

export function withPodContributions(actions: ResourceAction[], pod: PodInfo, app: App): ResourceAction[] {
  return merged(
    actions,
    contributions(app, MenuContext.DASHBOARD_POD, 'podItem', () => podArg(pod)),
  );
}

export function withVolumeContributions(actions: ResourceAction[], volume: VolumeInfo, app: App): ResourceAction[] {
  return merged(
    actions,
    contributions(app, MenuContext.DASHBOARD_VOLUME, 'volumeItem', () => volumeArg(volume)),
  );
}

export function withNetworkContributions(
  actions: ResourceAction[],
  network: NetworkInspectInfo,
  app: App,
): ResourceAction[] {
  return merged(
    actions,
    contributions(app, MenuContext.DASHBOARD_NETWORK, 'networkItem', () => networkArg(network)),
  );
}

export function withSecretContributions(actions: ResourceAction[], secret: SecretInfo, app: App): ResourceAction[] {
  return merged(
    actions,
    contributions(app, MenuContext.DASHBOARD_SECRET, 'secretItem', () => ({ ...secret })),
  );
}

/** @param containers the containers of the project */
export function withComposeContributions(
  actions: ResourceAction[],
  project: { engineId: string; name: string; status: string; containers: ContainerInfo[] },
  app: App,
): ResourceAction[] {
  return merged(
    actions,
    contributions(app, MenuContext.DASHBOARD_COMPOSE, 'composeItem', () => ({
      engineId: project.engineId,
      engineType: project.containers[0]?.engineType,
      name: project.name,
      status: project.status,
      containers: project.containers.map(containerArg),
    })),
  );
}

export function withConnectionContributions(
  actions: ResourceAction[],
  connection: ProviderContainerConnectionInfo,
  app: App,
): ResourceAction[] {
  return merged(
    actions,
    contributions(
      app,
      MenuContext.DASHBOARD_CONTAINER_CONNECTION,
      'providerConnectionItem',
      () => ({ ...connection }),
      () => ({
        selectedProviderConnectionType: connection.type,
        selectedProviderConnectionStatus: connection.status,
      }),
    ),
  );
}
