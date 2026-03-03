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

import { get } from 'svelte/store';
import type { Mock } from 'vitest';
import { assert, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  registeredFeatures,
  registeredFeaturesEventStore,
  registeredFeaturesEventStoreInfo,
} from './registered-features';

const callbacks = new Map<string, () => void>();
const eventEmitter = {
  receive: (message: string, callback: () => void): void => {
    callbacks.set(message, callback);
  },
};

const getRegisteredFeaturesMock: Mock<() => Promise<string[]>> = vi.fn();

Object.defineProperty(global, 'window', {
  value: {
    getRegisteredFeatures: getRegisteredFeaturesMock,
    events: {
      receive: eventEmitter.receive,
    },
    addEventListener: eventEmitter.receive,
  },
  writable: true,
});

beforeAll(() => {
  vi.clearAllMocks();
});

describe('registeredFeaturesEventStore', () => {
  test('registered features should be updated when extensions-already-started fires', async () => {
    getRegisteredFeaturesMock.mockResolvedValue(['kubernetes-contexts-manager']);
    registeredFeaturesEventStore.setup();

    await registeredFeaturesEventStoreInfo.fetch();

    const features = get(registeredFeatures);
    expect(features).toEqual(['kubernetes-contexts-manager']);
  });

  test('registered features should be updated when feature-registry:features-updated fires', async () => {
    getRegisteredFeaturesMock.mockResolvedValue(['kubernetes-contexts-manager']);
    registeredFeaturesEventStore.setup();

    await registeredFeaturesEventStoreInfo.fetch();
    expect(get(registeredFeatures)).toEqual(['kubernetes-contexts-manager']);

    getRegisteredFeaturesMock.mockResolvedValue(['kubernetes-contexts-manager', 'another-feature']);

    const updatedCallback = callbacks.get('feature-registry:features-updated');
    assert(updatedCallback);
    updatedCallback();

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(get(registeredFeatures)).toEqual(['kubernetes-contexts-manager', 'another-feature']);
  });
});
