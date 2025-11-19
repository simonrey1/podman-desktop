/**********************************************************************
 * Copyright (C) 2023-2025 Red Hat, Inc.
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

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, type RenderResult, screen } from '@testing-library/svelte';
/* eslint-disable import/no-duplicates */
import { type Component, type ComponentProps, tick } from 'svelte';
import { get } from 'svelte/store';
/* eslint-enable import/no-duplicates */
import { beforeEach, expect, test, vi } from 'vitest';

import type { ContainerInfo } from '/@api/container-info';
import type { ProviderInfo } from '/@api/provider-info';

import { containersInfos } from '../../stores/containers';
import { providerInfos } from '../../stores/providers';
import ContainerList from './ContainerList.svelte';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(window.listPods).mockResolvedValue([]);
  vi.mocked(window.listViewsContributions).mockResolvedValue([]);
  vi.mocked(window.getContributedMenus).mockResolvedValue([]);
  vi.mocked(window.getConfigurationValue).mockResolvedValue(false);
  vi.mocked(window.onDidUpdateProviderStatus).mockResolvedValue(undefined);
  vi.mocked(window.listContainers).mockResolvedValue([]);
  vi.mocked(window.getProviderInfos).mockResolvedValue([
    {
      name: 'podman',
      status: 'started',
      internalId: 'podman-internal-id',
      containerConnections: [
        {
          name: 'podman-machine-default',
          status: 'started',
        },
      ],
    } as ProviderInfo,
  ]);
  // fake the window.events object
  (window.events as unknown) = {
    receive: (_channel: string, func: () => void): void => {
      func();
    },
  };
});

async function waitRender(
  customProperties: object,
): Promise<RenderResult<Component<ComponentProps<typeof ContainerList>>>> {
  const result = render(ContainerList, { ...customProperties });
  await tick();
  return result;
}

test('Expect to display running / stopped containers depending on tab', { timeout: 20_000 }, async () => {
  window.dispatchEvent(new CustomEvent('extensions-already-started'));
  window.dispatchEvent(new CustomEvent('provider-lifecycle-change'));
  window.dispatchEvent(new CustomEvent('tray:update-provider'));

  // wait for the store to be cleared
  await vi.waitFor(() => expect(get(containersInfos).length).toBe(0), { timeout: 5_000 });

  vi.mocked(window.getProviderInfos).mockResolvedValue([
    {
      name: 'podman',
      status: 'started',
      internalId: 'podman-internal-id',
      containerConnections: [
        {
          name: 'podman-machine-default',
          status: 'started',
        },
      ],
    } as ProviderInfo,
  ]);

  const pod1Id = 'pod1-id';
  const pod2Id = 'pod2-id';
  const pod3Id = 'pod3-id';

  // 3 pods with 2 containers each
  const mockedContainers = [
    // 2 / 2 containers are running on this pod
    {
      Id: 'sha256:68347658374683476',
      Image: 'sha256:234',
      Names: ['container1-pod1'],
      State: 'Running',
      pod: {
        name: 'pod1',
        id: pod1Id,
        status: 'Running',
      },
      engineId: 'podman',
      engineName: 'podman',
      ImageID: 'dummy-image-id',
    } as ContainerInfo,
    {
      Id: 'sha256:7897891234567890123',
      Image: 'sha256:345',
      Names: ['container2-pod1'],
      State: 'Running',
      pod: {
        name: 'pod1',
        id: pod1Id,
        status: 'Running',
      },
      engineId: 'podman',
      engineName: 'podman',
      ImageID: 'dummy-image-id',
    } as ContainerInfo,

    // 1 / 2 containers are running on this pod
    {
      Id: 'sha256:876532948235',
      Image: 'sha256:876',
      Names: ['container1-pod2'],
      State: 'Running',
      pod: {
        name: 'pod2',
        id: pod2Id,
        status: 'Running',
      },
      engineId: 'podman',
      engineName: 'podman',
      ImageID: 'dummy-image-id',
    } as ContainerInfo,
    {
      Id: 'sha256:834752375490',
      Image: 'sha256:834',
      Names: ['container2-pod2'],
      State: 'Stopped',
      pod: {
        name: 'pod2',
        id: pod2Id,
        status: 'Running',
      },
      engineId: 'podman',
      engineName: 'podman',
      ImageID: 'dummy-image-id',
    } as ContainerInfo,

    // 0 / 2 containers are running on this pod
    {
      Id: 'sha256:56283769268',
      Image: 'sha256:562',
      Names: ['container1-pod3'],
      State: 'Stopped',
      pod: {
        name: 'pod3',
        id: pod3Id,
        status: 'Stopped',
      },
      engineId: 'podman',
      engineName: 'podman',
      ImageID: 'dummy-image-id',
    } as ContainerInfo,
    {
      Id: 'sha256:834752375490',
      Image: 'sha256:834',
      Names: ['container2-pod3'],
      State: 'Stopped',
      pod: {
        name: 'pod3',
        id: pod3Id,
        status: 'Stopped',
      },
      engineId: 'podman',
      engineName: 'podman',
      ImageID: 'dummy-image-id',
    } as ContainerInfo,
  ];

  vi.mocked(window.listContainers).mockResolvedValue(mockedContainers);

  window.dispatchEvent(new CustomEvent('extensions-already-started'));
  window.dispatchEvent(new CustomEvent('provider-lifecycle-change'));
  window.dispatchEvent(new CustomEvent('tray:update-provider'));

  // wait until store is populated
  await vi.waitFor(() => expect(get(containersInfos).length).toBe(6), { timeout: 5_000 });
  await vi.waitFor(() => expect(get(providerInfos).length).toBe(1), { timeout: 5_000 });

  await waitRender({});

  const tests = [
    {
      tabLabel: undefined,
      presentCells: [
        'pod1 (pod) 2 containers',
        'container1-pod1 RUNNING',
        'container2-pod1 RUNNING',
        'pod2 (pod) 2 containers',
        'container1-pod2 RUNNING',
        'container2-pod2 STOPPED',
        'pod3 (pod) 2 containers',
        'container1-pod3 STOPPED',
        'container2-pod3 STOPPED',
      ],
      absentLabels: [],
    },
    {
      tabLabel: 'Running',
      presentCells: [
        'pod1 (pod) 2 containers',
        'container1-pod1 RUNNING',
        'container2-pod1 RUNNING',
        'pod2 (pod) 2 containers (1 filtered)',
        'container1-pod2 RUNNING',
      ],
      absentLabels: [/container2-pod2.*/, /pod3 \(pod\).*/, /container1-pod3.*/, /container2-pod3.*/],
    },
    {
      tabLabel: 'Stopped',
      presentCells: [
        'pod2 (pod) 2 containers (1 filtered)',
        'container2-pod2 STOPPED',
        'pod3 (pod) 2 containers',
        'container1-pod3 STOPPED',
        'container2-pod3 STOPPED',
      ],
      absentLabels: [/pod1 \(pod\).*/, /container1-pod1.*/, /container2-pod1.*/, /container1-pod2.*/],
    },
  ];

  for (const tt of tests) {
    if (tt.tabLabel) {
      const tab = screen.getByRole('button', { name: tt.tabLabel });
      await fireEvent.click(tab);
    }
    for (const presentCell of tt.presentCells) {
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: presentCell })).toBeInTheDocument();
      });
    }
    for (const absentCell of tt.absentLabels) {
      await vi.waitFor(() => {
        expect(screen.queryByText(absentCell)).not.toBeInTheDocument();
      });
    }
  }
});

test('Expect user confirmation to pop up when preferences require', async () => {
  vi.mocked(window.listContainers).mockResolvedValue([]);
  vi.mocked(window.getConfigurationValue).mockResolvedValue(true);
  vi.mocked(window.showMessageBox).mockResolvedValue({ response: 1 });

  window.dispatchEvent(new CustomEvent('extensions-already-started'));
  window.dispatchEvent(new CustomEvent('provider-lifecycle-change'));
  window.dispatchEvent(new CustomEvent('tray:update-provider'));

  // wait for the store to be cleared
  await vi.waitFor(() => get(containersInfos).length === 0);

  // one single container and a container as part of a pod
  const mockedContainers = [
    {
      Id: 'sha256:123454321',
      Image: 'sha256:123',
      Names: ['foo1'],
      Status: 'Running',
      engineId: 'podman',
      engineName: 'podman',
      ImageID: 'dummy-image-id',
    } as ContainerInfo,
  ];

  vi.mocked(window.listContainers).mockResolvedValue(mockedContainers);

  window.dispatchEvent(new CustomEvent('extensions-already-started'));
  window.dispatchEvent(new CustomEvent('provider-lifecycle-change'));
  window.dispatchEvent(new CustomEvent('tray:update-provider'));

  // wait until the store is populated
  await vi.waitFor(() => get(containersInfos).length > 0);

  await waitRender({});

  // select the standalone container checkbox
  const checkboxes = screen.getAllByRole('checkbox', { name: 'Toggle container' });
  await fireEvent.click(checkboxes[0]);

  const deleteButton = await vi.waitFor(() =>
    screen.getByRole('button', { name: 'Delete selected containers and pods' }),
  );
  await fireEvent.click(deleteButton);

  expect(window.showMessageBox).toHaveBeenCalledOnce();

  vi.mocked(window.showMessageBox).mockResolvedValue({ response: 0 });
  await fireEvent.click(deleteButton);
  expect(window.showMessageBox).toHaveBeenCalledTimes(2);
  await vi.waitFor(() => expect(window.deleteContainer).toHaveBeenCalled());
});
