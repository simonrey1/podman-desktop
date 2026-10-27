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

import { ApiSenderType } from '@desktop-framework/api/api-sender';
import { Container } from 'inversify';
import { expect, test, vi } from 'vitest';

import { ApiSender } from '/@/app/api-sender.js';
import { SecurityRestrictions } from '/@/app/security-restrictions.js';
import { ElectronApp, StartupSymbol } from '/@/inject/symbol.js';
import { MainWindowDeferred } from '/@/plugin/api.js';

import { module } from './$module.js';

test('should bind a single main window deferred', () => {
  const container = new Container();
  container.load(module);

  const deferred = container.get<PromiseWithResolvers<unknown>>(MainWindowDeferred);

  expect(deferred.promise).toBeInstanceOf(Promise);
  expect(container.get(MainWindowDeferred)).toBe(deferred);
});

test('should bind the api sender as the ApiSenderType singleton', () => {
  const container = new Container();
  container.load(module);

  expect(container.get(ApiSenderType)).toBe(container.get(ApiSender));
});

test('should instantiate the security restrictions as a startup service', () => {
  const app = { on: vi.fn() } as unknown as Electron.App;
  const container = new Container();
  container.bind(ElectronApp).toConstantValue(app);
  container.load(module);

  const startupServices = container.getAll(StartupSymbol);

  expect(startupServices).toContainEqual(expect.any(SecurityRestrictions));
  expect(app.on).toHaveBeenCalledWith('web-contents-created', expect.any(Function));
});
