/**********************************************************************
 * Copyright (C) 2025 Red Hat, Inc.
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

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { IPCHandle } from '/@/plugin/api.js';

import { ContainerfileParser } from './containerfile-parser.js';

let containerFileParser: ContainerfileParser;

const ipcHandle = {} as unknown as IPCHandle;
beforeEach(() => {
  vi.resetAllMocks();
  containerFileParser = new ContainerfileParser(ipcHandle);
});

const fixturesDir = join(__dirname, '__tests__', 'fixtures', 'containerfile-parser');

describe('Should parse info from container files', async () => {
  test.each(
    readdirSync(fixturesDir).map(file => ({
      name: file,
      path: join(fixturesDir, file),
    })),
  )('should parse targets from $name', async ({ path }) => {
    const info = await containerFileParser.parse(path);
    expect(info.targets).toMatchSnapshot();
  });

  test('should throw error if file does not exist', async () => {
    await expect(containerFileParser.parse('/tmp/nonexistent-Containerfile')).rejects.toThrow(
      'ENOENT: no such file or directory',
    );
  });
});
