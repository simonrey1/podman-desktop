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

import type { IConfigurationRegistry } from '@desktop-framework/api/configuration';
import type { Configuration } from '@desktop-framework/extension-api';
import { beforeEach, expect, test, vi } from 'vitest';

import { RendererV2Configuration } from './renderer-v2-configuration.js';

let value: unknown;
let configurationRegistry: IConfigurationRegistry;

beforeEach(() => {
  vi.resetAllMocks();
  value = undefined;
  const registry: Partial<IConfigurationRegistry> = {
    registerConfigurations: vi.fn(),
    getConfiguration: vi.fn().mockReturnValue({ get: vi.fn(() => value) } as Partial<Configuration>),
  };
  configurationRegistry = registry as IConfigurationRegistry;
});

test('should register the experimental flag, disabled by default', () => {
  new RendererV2Configuration(configurationRegistry).init();

  const node = vi.mocked(configurationRegistry.registerConfigurations).mock.calls[0]?.[0][0];
  expect(node?.id).toBe('preferences.experimental.rendererV2');
  expect(node?.properties?.['rendererV2.enabled']).toEqual(
    expect.objectContaining({ type: 'object', default: false, experimental: {} }),
  );
});

test.each([
  { value: undefined, enabled: false },
  { value: false, enabled: false },
  { value: {}, enabled: true },
])('isEnabled should be $enabled when the value is $value', ({ value: configured, enabled }) => {
  value = configured;

  expect(new RendererV2Configuration(configurationRegistry).isEnabled()).toBe(enabled);
  expect(configurationRegistry.getConfiguration).toHaveBeenCalledWith('rendererV2');
});
