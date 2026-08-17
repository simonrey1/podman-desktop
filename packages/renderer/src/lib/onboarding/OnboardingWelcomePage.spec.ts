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
import type { writable } from 'svelte/store';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { onboardingList } from '/@/stores/onboarding';

import OnboardingWelcomePage from './OnboardingWelcomePage.svelte';

const mockSetTelemetry = vi.fn();
const mockHavePromptedForTelemetry = vi.fn();
const mockGetTelemetryMessages = vi.fn();
const mockOpenExternal = vi.fn();

vi.mock(import('/@/stores/onboarding'), async () => ({
  onboardingList: (await import('svelte/store')).writable([]),
}));

vi.mock(import('/@/lib/welcome/welcome-utils'), async importOriginal => {
  const orig = await importOriginal();
  class MockWelcomeUtils extends orig.WelcomeUtils {
    override setTelemetry = mockSetTelemetry;
    override havePromptedForTelemetry = mockHavePromptedForTelemetry;
  }
  return { WelcomeUtils: MockWelcomeUtils };
});

const mockOnSkip = vi.fn();
const mockOnStart = vi.fn();

function renderPage(overrides: Record<string, unknown> = {}): ReturnType<typeof render> {
  return render(OnboardingWelcomePage, {
    props: {
      extensionSelections: {},
      onSkip: mockOnSkip,
      onStart: mockOnStart,
      ...overrides,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (onboardingList as ReturnType<typeof writable>).set([]);
  mockHavePromptedForTelemetry.mockResolvedValue(false);
  mockGetTelemetryMessages.mockResolvedValue({
    acceptMessage: 'Help us improve',
    info: { url: 'https://example.com/privacy', link: 'Privacy statement' },
  });
  (window as Record<string, unknown>).getTelemetryMessages = mockGetTelemetryMessages;
  (window as Record<string, unknown>).openExternal = mockOpenExternal;
});

describe('OnboardingWelcomePage', () => {
  test('renders the welcome heading', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Podman Desktop!');
  });

  test('renders the setup description', () => {
    renderPage();

    expect(screen.getByText(/seamless experience with containers and Kubernetes/)).toBeInTheDocument();
  });

  test('shows telemetry section when not previously prompted', async () => {
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Enable telemetry' })).toBeInTheDocument();
    });
  });

  test('hides telemetry section when already prompted', async () => {
    mockHavePromptedForTelemetry.mockResolvedValue(true);
    renderPage();

    await vi.waitFor(() => {
      expect(mockHavePromptedForTelemetry).toHaveBeenCalled();
    });

    expect(screen.queryByRole('checkbox', { name: 'Enable telemetry' })).not.toBeInTheDocument();
  });

  test('displays telemetry messages from IPC', async () => {
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByText('Help us improve')).toBeInTheDocument();
    });

    expect(screen.getByText('Privacy statement')).toBeInTheDocument();
  });

  test('toggles telemetry checkbox on click', async () => {
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Enable telemetry' })).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox', { name: 'Enable telemetry' });
    expect(checkbox).toBeChecked();

    await fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  test('calls setTelemetry when Start setup is clicked and telemetry not yet prompted', async () => {
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Enable telemetry' })).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Start setup' }));

    expect(mockSetTelemetry).toHaveBeenCalledWith(true);
    expect(mockOnStart).toHaveBeenCalledOnce();
  });

  test('calls setTelemetry with false when telemetry unchecked and Skip is clicked', async () => {
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Enable telemetry' })).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Enable telemetry' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Skip entire setup' }));

    expect(mockSetTelemetry).toHaveBeenCalledWith(false);
    expect(mockOnSkip).toHaveBeenCalledOnce();
  });

  test('does not call setTelemetry when already prompted', async () => {
    mockHavePromptedForTelemetry.mockResolvedValue(true);
    renderPage();

    await vi.waitFor(() => {
      expect(mockHavePromptedForTelemetry).toHaveBeenCalled();
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Start setup' }));

    expect(mockSetTelemetry).not.toHaveBeenCalled();
    expect(mockOnStart).toHaveBeenCalledOnce();
  });

  test('renders the choose extensions label', () => {
    renderPage();

    expect(screen.getByText('Choose the extensions to include:')).toBeInTheDocument();
  });

  test('renders extension cards from onboarding store', async () => {
    (onboardingList as ReturnType<typeof writable>).set([
      {
        extension: 'podman',
        name: 'podman',
        displayName: 'Podman',
        icon: '',
        description: 'Integration for Podman',
        steps: [],
        title: 'Podman',
        removable: true,
      },
    ]);

    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Podman: Integration for Podman' })).toBeInTheDocument();
    });
  });

  test('derives onboarding steps from checked extensions', async () => {
    (onboardingList as ReturnType<typeof writable>).set([
      {
        extension: 'podman',
        name: 'podman',
        displayName: 'Podman',
        icon: '',
        description: 'Integration for Podman',
        steps: [],
        title: 'Podman',
        removable: true,
      },
    ]);

    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByText('Podman setup')).toBeInTheDocument();
    });
  });
});
