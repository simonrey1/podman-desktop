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

test('Expect user confirmation to pop up when preferences require', async () => {
  let a, b, duration;
  const startTest = performance.now();
  a = performance.now();
  vi.mocked(window.listContainers).mockResolvedValue([]);
  vi.mocked(window.getConfigurationValue).mockResolvedValue(true);
  vi.mocked(window.showMessageBox).mockResolvedValue({ response: 1 });
  b = performance.now();
  duration = b - a;
  console.log(`[SETUP] Mocking initial functions: ${duration.toFixed(0)}ms`);

  a = performance.now();
  window.dispatchEvent(new CustomEvent('extensions-already-started'));
  window.dispatchEvent(new CustomEvent('provider-lifecycle-change'));
  window.dispatchEvent(new CustomEvent('tray:update-provider'));
  b = performance.now();
  duration = b - a;
  console.log(`[EVENT] Dispatching initial events: ${duration.toFixed(0)}ms`);

  // wait for the store to be cleared
  a = performance.now();
  await vi.waitFor(() => get(containersInfos).length === 0);
  b = performance.now();
  duration = b - a;
  console.log(`[WAIT] Store cleared: ${duration.toFixed(0)}ms`);

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

  a = performance.now();
  vi.mocked(window.listContainers).mockResolvedValue(mockedContainers);
  b = performance.now();
  duration = b - a;
  console.log(`[SETUP] Mocking containers list: ${duration.toFixed(0)}ms`);

  a = performance.now();
  window.dispatchEvent(new CustomEvent('extensions-already-started'));
  window.dispatchEvent(new CustomEvent('provider-lifecycle-change'));
  window.dispatchEvent(new CustomEvent('tray:update-provider'));
  b = performance.now();
  duration = b - a;
  console.log(`[EVENT] Dispatching population events: ${duration.toFixed(0)}ms`);

  // wait until the store is populated
  a = performance.now();
  await vi.waitFor(() => get(containersInfos).length > 0);
  await vi.waitFor(() => get(providerInfos).length > 0);
  b = performance.now();
  duration = b - a;
  console.log(`[WAIT] Store populated: ${duration.toFixed(0)}ms`);

  a = performance.now();
  await waitRender({});
  b = performance.now();
  duration = b - a;
  console.log(`[RENDER] Initial render: ${duration.toFixed(0)}ms`);

  // select the standalone container checkbox
  a = performance.now();
  const checkboxes = screen.getAllByRole('checkbox', { name: 'Toggle container' });
  await fireEvent.click(checkboxes[0]);
  b = performance.now();
  duration = b - a;
  console.log(`[ACTION] Click checkbox: ${duration.toFixed(0)}ms`);

  console.log(screen.logTestingPlaygroundURL());

  a = performance.now();
  const deleteButton = await vi.waitFor(() => {
    console.log(screen.logTestingPlaygroundURL());
    return screen.getByRole('button', { name: 'Delete selected containers and pods' });
  });
  b = performance.now();
  duration = b - a;
  console.log(`[WAIT] Get delete button: ${duration.toFixed(0)}ms`);

  a = performance.now();
  await fireEvent.click(deleteButton);
  b = performance.now();
  duration = b - a;
  console.log(`[ACTION] First delete button click: ${duration.toFixed(0)}ms`);

  a = performance.now();
  expect(window.showMessageBox).toHaveBeenCalledOnce();
  b = performance.now();
  duration = b - a;
  console.log(`[ASSERT] First showMessageBox call: ${duration.toFixed(0)}ms`);

  a = performance.now();
  vi.mocked(window.showMessageBox).mockResolvedValue({ response: 0 });
  await fireEvent.click(deleteButton);
  b = performance.now();
  duration = b - a;
  console.log(`[ACTION] Second delete button click: ${duration.toFixed(0)}ms`);

  a = performance.now();
  expect(window.showMessageBox).toHaveBeenCalledTimes(2);
  b = performance.now();
  duration = b - a;
  console.log(`[ASSERT] Second showMessageBox call: ${duration.toFixed(0)}ms`);

  a = performance.now();
  await vi.waitFor(() => expect(window.deleteContainer).toHaveBeenCalled());
  b = performance.now();
  duration = b - a;
  console.log(`[WAIT] deleteContainer called: ${duration.toFixed(0)}ms`);

  const endTest = performance.now();
  const totalDuration = endTest - startTest;
  console.log(`--- TOTAL TEST DURATION: ${totalDuration.toFixed(0)}ms ---`);
});
