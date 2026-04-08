/**********************************************************************
 * Copyright (C) 2022-2026 Red Hat, Inc.
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

import type { Response as UndiciResponse } from 'undici';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getMemTotalInfo, parseKindVersion, removeVersionPrefix } from './util';

vi.mock(import('undici'));

const { fetch: mockedFetch } = vi.mocked(await import('undici'));

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getMemTotalInfo', () => {
  test('returns MemTotal from a successful response', async () => {
    vi.mocked(mockedFetch).mockResolvedValue({
      ok: true,
      json: async () => ({ MemTotal: 8000000000 }),
    } as unknown as UndiciResponse);

    const result = await getMemTotalInfo('/var/run/docker.sock');

    expect(result).toBe(8000000000);
    expect(mockedFetch).toHaveBeenCalledWith('http://localhost/info', {
      dispatcher: expect.anything(),
    });
  });

  test('throws on non-ok response', async () => {
    vi.mocked(mockedFetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as unknown as UndiciResponse);

    await expect(getMemTotalInfo('/var/run/docker.sock')).rejects.toThrow(
      'Failed to get info: 500 Internal Server Error',
    );
  });

  test('throws on network error', async () => {
    vi.mocked(mockedFetch).mockRejectedValue(new Error('connect ENOENT /bad/socket'));

    await expect(getMemTotalInfo('/bad/socket')).rejects.toThrow('connect ENOENT /bad/socket');
  });
});

describe('parseKindVersion', () => {
  test('parses valid version string', () => {
    expect(parseKindVersion('kind version 0.20.0')).toBe('0.20.0');
  });

  test('throws on malformed output', () => {
    expect(() => parseKindVersion('v0.20.0')).toThrow('malformed kind output');
  });
});

describe('removeVersionPrefix', () => {
  test('removes v prefix', () => {
    expect(removeVersionPrefix('v1.2.3')).toBe('1.2.3');
  });

  test('trims whitespace', () => {
    expect(removeVersionPrefix('  v1.2.3  ')).toBe('1.2.3');
  });

  test('handles version without prefix', () => {
    expect(removeVersionPrefix('1.2.3')).toBe('1.2.3');
  });
});
