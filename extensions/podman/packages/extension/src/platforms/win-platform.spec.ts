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
/* eslint-disable @typescript-eslint/explicit-function-return-type */

import type { ExtensionContext, TelemetryLogger } from '@podman-desktop/api';
import * as extensionApi from '@podman-desktop/api';
import { beforeEach, expect, test, vi } from 'vitest';

import type { HyperVCheck } from '/@/checks/windows/hyperv-check';
import type { HyperVPodmanVersionCheck } from '/@/checks/windows/hyperv-podman-version-check';
import type { VirtualMachinePlatformCheck } from '/@/checks/windows/virtual-machine-platform-check';
import type { WinBitCheck } from '/@/checks/windows/win-bit-check';
import type { WinMemoryCheck } from '/@/checks/windows/win-memory-check';
import type { WinVersionCheck } from '/@/checks/windows/win-version-check';
import type { WSLVersionCheck } from '/@/checks/windows/wsl-version-check';
import type { WSL2Check } from '/@/checks/windows/wsl2-check';

import { WinPlatform } from './win-platform';

vi.mock('@podman-desktop/api', () => ({ env: { isWindows: false } }));

const extensionContextMock = {} as ExtensionContext;
const telemetryLoggerMock = {} as TelemetryLogger;

const winBitCheckMock = { execute: vi.fn() } as unknown as WinBitCheck;
const winVersionCheckMock = { execute: vi.fn() } as unknown as WinVersionCheck;
const winMemoryCheckMock = { execute: vi.fn() } as unknown as WinMemoryCheck;
const hyperVPodmanVersionCheckMock = { execute: vi.fn() } as unknown as HyperVPodmanVersionCheck;
const hyperVCheckMock = { execute: vi.fn() } as unknown as HyperVCheck;
const virtualMachinePlatformCheckMock = { execute: vi.fn() } as unknown as VirtualMachinePlatformCheck;
const wSLVersionCheckMock = { execute: vi.fn() } as unknown as WSLVersionCheck;
const wSL2CheckMock = { execute: vi.fn() } as unknown as WSL2Check;

const successfulCheckResult = { successful: true };
const failedCheckResult = { successful: false };

let winPlatform: WinPlatform;

beforeEach(() => {
  winPlatform = new WinPlatform(
    extensionContextMock,
    telemetryLoggerMock,
    winBitCheckMock,
    winVersionCheckMock,
    winMemoryCheckMock,
    hyperVPodmanVersionCheckMock,
    hyperVCheckMock,
    virtualMachinePlatformCheckMock,
    wSLVersionCheckMock,
    wSL2CheckMock,
  );
});

test('isHyperVEnabled should return false if it is not a Windows environment', async () => {
  vi.mocked(extensionApi.env).isWindows = false;

  const hypervEnabled = await winPlatform.isHyperVEnabled();

  expect(hypervEnabled).toBeFalsy();
});

test('isHyperVEnabled should return false if Hyper-V check fails', async () => {
  vi.mocked(extensionApi.env).isWindows = true;

  vi.mocked(hyperVCheckMock.execute).mockResolvedValue(failedCheckResult);
  vi.mocked(hyperVPodmanVersionCheckMock.execute).mockResolvedValue(failedCheckResult);

  const hypervEnabled = await winPlatform.isHyperVEnabled();

  expect(hypervEnabled).toBeFalsy();
});

test('isHyperVEnabled should return true if all Hyper-V checks succeed', async () => {
  vi.mocked(extensionApi.env).isWindows = true;

  vi.mocked(hyperVCheckMock.execute).mockResolvedValue(successfulCheckResult);
  vi.mocked(hyperVPodmanVersionCheckMock.execute).mockResolvedValue(successfulCheckResult);

  const hypervEnabled = await winPlatform.isHyperVEnabled();

  expect(hypervEnabled).toBeTruthy();
});

test('isWSLEnabled should return false if not on Windows', async () => {
  vi.mocked(extensionApi.env).isWindows = false;

  const wslEnabled = await winPlatform.isWSLEnabled();

  expect(wslEnabled).toBeFalsy();
});

test('isWSLEnabled should return false if any WSL check fails', async () => {
  vi.mocked(extensionApi.env).isWindows = true;

  vi.mocked(virtualMachinePlatformCheckMock.execute).mockResolvedValue(successfulCheckResult);
  vi.mocked(wSLVersionCheckMock.execute).mockResolvedValue(failedCheckResult);
  vi.mocked(wSL2CheckMock.execute).mockResolvedValue(successfulCheckResult);

  const wslEnabled = await winPlatform.isWSLEnabled();

  expect(wslEnabled).toBeFalsy();
});

test('isWSLEnabled should return true if all WSL checks succeed', async () => {
  vi.mocked(extensionApi.env).isWindows = true;

  vi.mocked(virtualMachinePlatformCheckMock.execute).mockResolvedValue(successfulCheckResult);
  vi.mocked(wSLVersionCheckMock.execute).mockResolvedValue(successfulCheckResult);
  vi.mocked(wSL2CheckMock.execute).mockResolvedValue(successfulCheckResult);

  const wslEnabled = await winPlatform.isWSLEnabled();

  expect(wslEnabled).toBeTruthy();
});
