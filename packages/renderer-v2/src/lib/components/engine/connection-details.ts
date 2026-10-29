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

import type { KeyValue } from '#lib/components/KeyValueCard.svelte';
import type { Connection } from '#lib/stores/engines.svelte.js';

const KINDS = { container: 'Container engine', kubernetes: 'Kubernetes cluster', vm: 'Virtual machine' };

/** the kind of a connection, in words: e.g. Kubernetes cluster */
export function kindLabel(connection: Connection): string {
  return KINDS[connection.kind];
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** What the provider tells about a connection: its provider, its type, its status or error, its endpoint. */
export function connectionDetails(connection: Connection): KeyValue[] {
  const { info, provider } = connection;
  const rows: KeyValue[] = [
    { label: 'Provider', value: provider.version ? `${provider.name} ${provider.version}` : provider.name },
    { label: 'Kind', value: kindLabel(connection) },
  ];
  if (info.connectionType === 'container') {
    rows.push({ label: 'Type', value: info.type === 'docker' ? 'Docker' : 'Podman' });
    if (info.vmType) {
      rows.push({ label: 'Virtual machine', value: info.vmType.name });
    }
  }
  rows.push({ label: 'Status', value: capitalized(info.status) });
  if (info.error) {
    rows.push({ label: 'Error', value: info.error });
  }
  if (info.connectionType === 'container') {
    rows.push({ label: 'Socket', value: info.endpoint.socketPath, mono: true, copy: true });
  } else if (info.connectionType === 'kubernetes') {
    rows.push({ label: 'API server', value: info.endpoint.apiURL, mono: true, copy: true });
  }
  return rows;
}
