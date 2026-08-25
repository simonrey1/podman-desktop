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
import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import OnboardingWelcomeTelemetry from './OnboardingWelcomeTelemetry.svelte';

const mockSetTelemetry = vi.fn();
const mockHavePromptedForTelemetry = vi.fn();

vi.mock(import('/@/lib/welcome/welcome-utils'), async importOriginal => {
  const orig = await importOriginal();
  class MockWelcomeUtils extends orig.WelcomeUtils {
    override setTelemetry = mockSetTelemetry;
    override havePromptedForTelemetry = mockHavePromptedForTelemetry;
  }
  return { WelcomeUtils: MockWelcomeUtils };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockHavePromptedForTelemetry.mockResolvedValue(false);
  (window as unknown as Record<string, unknown>).getTelemetryMessages = vi.fn().mockResolvedValue({
    acceptMessage: 'Help us improve',
    info: { url: 'https://example.com/privacy', link: 'Privacy statement' },
  });
  (window as unknown as Record<string, unknown>).openExternal = vi.fn();
});

describe('OnboardingWelcomeTelemetry', () => {
  test('shows telemetry checkbox when not previously prompted', async () => {
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Telemetry' })).toBeInTheDocument();
    });
  });

  test('persists default telemetry value (true) on mount when not previously prompted', async () => {
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(mockSetTelemetry).toHaveBeenCalledWith(true);
    });
  });

  test('hides telemetry when already prompted', async () => {
    mockHavePromptedForTelemetry.mockResolvedValue(true);
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(mockHavePromptedForTelemetry).toHaveBeenCalled();
    });

    expect(screen.queryByRole('checkbox', { name: 'Telemetry' })).not.toBeInTheDocument();
  });

  test('displays telemetry accept message and privacy link', async () => {
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(screen.getByText('Help us improve')).toBeInTheDocument();
    });
    expect(screen.getByText('Privacy statement')).toBeInTheDocument();
  });

  test('checkbox is checked by default', async () => {
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Telemetry' })).toBeChecked();
    });
  });

  test('persists telemetry as false immediately when unchecked', async () => {
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Telemetry' })).toBeInTheDocument();
    });

    mockSetTelemetry.mockClear();
    const checkbox = screen.getByRole('checkbox', { name: 'Telemetry' });
    await fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(mockSetTelemetry).toHaveBeenCalledWith(false);
  });

  test('persists telemetry as true immediately when re-checked', async () => {
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Telemetry' })).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: 'Telemetry' });
    await fireEvent.click(checkbox);
    mockSetTelemetry.mockClear();
    await fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(mockSetTelemetry).toHaveBeenCalledWith(true);
  });

  test('clicking the visible Telemetry label toggles the checkbox', async () => {
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Telemetry' })).toBeChecked();
    });

    mockSetTelemetry.mockClear();
    await fireEvent.click(screen.getByText('Telemetry'));

    expect(screen.getByRole('checkbox', { name: 'Telemetry' })).not.toBeChecked();
    expect(mockSetTelemetry).toHaveBeenCalledWith(false);
  });

  test('does not show or persist telemetry when already prompted', async () => {
    mockHavePromptedForTelemetry.mockResolvedValue(true);
    render(OnboardingWelcomeTelemetry);

    await vi.waitFor(() => {
      expect(mockHavePromptedForTelemetry).toHaveBeenCalled();
    });

    expect(screen.queryByRole('checkbox', { name: 'Telemetry' })).not.toBeInTheDocument();
    expect(mockSetTelemetry).not.toHaveBeenCalled();
  });
});
