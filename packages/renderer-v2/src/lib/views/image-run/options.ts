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

import type { ContainerCreateOptions, DeviceMapping, HostConfig } from '@desktop-framework/api';

/** A port of the container published on the host: `8080` or a range `8080-8090`, `/udp` for the container side. */
export interface PortMapping {
  hostPort: string;
  containerPort: string;
}

export interface VolumeMapping {
  /** bind: a directory of the host; volume: a volume of the engine, by name */
  type: 'bind' | 'volume';
  source: string;
  target: string;
}

export interface SecretMapping {
  name: string;
  /** mount: a file in the container; env: an environment variable */
  type: 'mount' | 'env';
  target: string;
}

export interface DeviceForm {
  host: string;
  /** the same path as on the host when empty */
  container: string;
  read: boolean;
  write: boolean;
  mknod: boolean;
}

export type NetworkMode = 'bridge' | 'host' | 'none' | 'network' | 'container';

/** The values of the form running an image. */
export interface RunForm {
  name: string;
  entrypoint: string;
  command: string;
  /** the ports exposed by the image, and the custom ones */
  ports: PortMapping[];
  volumes: VolumeMapping[];
  env: { key: string; value: string }[];
  envFiles: string[];
  secrets: SecretMapping[];
  tty: boolean;
  interactive: boolean;
  user: string;
  autoRemove: boolean;
  /** '': the default of the engine */
  restartPolicy: '' | 'no' | 'always' | 'unless-stopped' | 'on-failure';
  retries: number;
  devices: DeviceForm[];
  hostname: string;
  dns: string[];
  extraHosts: { host: string; ip: string }[];
  networkMode: NetworkMode;
  /** the ID of the network, for the network mode */
  network: string;
  /** the ID of the container, for the container mode */
  container: string;
  privileged: boolean;
  readOnly: boolean;
  securityOptions: string[];
  capAdd: string[];
  capDrop: string[];
  userns: string;
}

/** splits a command line on its spaces, not on those between double quotes */
export function splitArguments(line: string): string[] {
  const tokens: string[] = [];
  let token = '';
  let quoted = false;
  for (const char of line) {
    if (char === ' ' && !quoted) {
      if (token) {
        tokens.push(token);
        token = '';
      }
    } else if (char === '"') {
      quoted = !quoted;
    } else {
      token += char;
    }
  }
  if (token) {
    tokens.push(token);
  }
  return tokens;
}

/** joins arguments in a command line, the ones with a space between double quotes */
export function joinArguments(args: string[]): string {
  return args.map(arg => (arg.includes(' ') && !arg.startsWith('"') ? `"${arg}"` : arg)).join(' ');
}

/** `8080-8090/tcp` → [8080, 8090]; a single port is a range of one */
export function portRange(value: string): { start: number; end: number } {
  const [start = '', end = start] = value
    .trim()
    .replace(/\/(tcp|udp)$/, '')
    .split('-');
  const range = { start: Number(start), end: Number(end) };
  if (!/^\d+$/.test(start) || !/^\d+$/.test(end) || range.end < range.start) {
    throw new Error(`${value} is not a port or a range of ports`);
  }
  return range;
}

function nonBlank(values: string[]): string[] {
  return values.map(value => value.trim()).filter(Boolean);
}

/**
 * The options creating the container of the image, as Podman Desktop v1 builds them.
 * @param image the image, by its name and tag (or its ID without a name)
 * @throws if a range of ports is not valid, or the host and container ranges differ in size
 */
export function createOptions(image: string, form: RunForm): ContainerCreateOptions {
  const portBindings: NonNullable<HostConfig['PortBindings']> = {};
  const exposedPorts: Record<string, object> = {};
  for (const { hostPort, containerPort } of form.ports) {
    const host = hostPort.trim();
    const container = containerPort.trim();
    if (!container) {
      continue;
    }
    if (host.includes('-') || container.includes('-')) {
      // a range: each of its ports
      const hosts = portRange(host);
      const containers = portRange(container);
      if (hosts.end - hosts.start !== containers.end - containers.start) {
        throw new Error(`The ranges ${host} and ${container} do not have the same size`);
      }
      // the protocol of the container side, for each of its ports
      const protocol = /\/(tcp|udp)$/.exec(container)?.[0] ?? '';
      for (let index = 0; index <= containers.end - containers.start; index++) {
        const port = `${containers.start + index}${protocol}`;
        portBindings[port] = [{ HostPort: String(hosts.start + index) }];
        exposedPorts[port] = {};
      }
    } else {
      // a port not published on the host is exposed only
      if (host) {
        portBindings[container] = [{ HostPort: host }];
      }
      exposedPorts[container] = {};
    }
  }

  const devices: DeviceMapping[] = form.devices
    .filter(device => device.host.trim())
    .map(device => ({
      PathOnHost: device.host.trim(),
      PathInContainer: device.container.trim() || device.host.trim(),
      CgroupPermissions:
        [device.read && 'r', device.write && 'w', device.mknod && 'm'].filter(Boolean).join('') || 'rwm',
    }));

  let networkMode: string = form.networkMode;
  if (form.networkMode === 'network') {
    networkMode = form.network;
  } else if (form.networkMode === 'container') {
    networkMode = `container:${form.container}`;
  }

  const hostConfig: HostConfig = {
    AutoRemove: form.autoRemove,
    Binds: form.volumes
      .filter(volume => volume.source.trim() && volume.target.trim())
      .map(volume => `${volume.source.trim()}:${volume.target.trim()}`),
    CapAdd: nonBlank(form.capAdd),
    CapDrop: nonBlank(form.capDrop),
    Devices: devices.length ? devices : undefined,
    Dns: nonBlank(form.dns).length ? nonBlank(form.dns) : undefined,
    ExtraHosts: form.extraHosts.some(entry => entry.host.trim() && entry.ip.trim())
      ? form.extraHosts
          .filter(entry => entry.host.trim() && entry.ip.trim())
          .map(entry => `${entry.host.trim()}:${entry.ip.trim()}`)
      : undefined,
    NetworkMode: networkMode,
    PortBindings: portBindings,
    Privileged: form.privileged,
    ReadonlyRootfs: form.readOnly,
    RestartPolicy: {
      Name: form.restartPolicy,
      ...(form.restartPolicy === 'on-failure' ? { MaximumRetryCount: form.retries } : {}),
    },
    SecurityOpt: nonBlank(form.securityOptions),
    ...(form.userns.trim() ? { UsernsMode: form.userns.trim() } : {}),
  };

  const options: ContainerCreateOptions = {
    Image: image,
    name: form.name.trim(),
    Env: form.env.filter(entry => entry.key.trim()).map(entry => `${entry.key.trim()}=${entry.value}`),
    EnvFiles: nonBlank(form.envFiles),
    ExposedPorts: exposedPorts,
    HostConfig: hostConfig,
    Tty: form.tty,
    OpenStdin: form.interactive,
    Secrets: form.secrets
      .filter(secret => secret.type === 'mount' && secret.name)
      .map(secret => ({ Source: secret.name, Target: secret.target.trim() })),
    SecretEnv: Object.fromEntries(
      form.secrets
        .filter(secret => secret.type === 'env' && secret.name && secret.target.trim())
        .map(secret => [secret.target.trim(), secret.name]),
    ),
  };
  if (form.command.trim()) {
    options.Cmd = splitArguments(form.command);
  }
  if (form.entrypoint.trim()) {
    options.Entrypoint = splitArguments(form.entrypoint);
  }
  if (form.user.trim()) {
    options.User = form.user.trim();
  }
  if (form.hostname.trim()) {
    options.Hostname = form.hostname.trim();
  }
  return options;
}
