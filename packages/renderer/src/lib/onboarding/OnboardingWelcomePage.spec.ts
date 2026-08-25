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

const mockGetVersion = vi.fn();
const mockUpdateVersion = vi.fn();

vi.mock(import('/@/stores/onboarding'), async () => ({
  onboardingList: (await import('svelte/store')).writable([]),
}));

vi.mock(import('/@/stores/providers'), async () => ({
  providerInfos: (await import('svelte/store')).writable([]),
}));

vi.mock(import('/@/lib/welcome/welcome-utils'), async importOriginal => {
  const orig = await importOriginal();
  class MockWelcomeUtils extends orig.WelcomeUtils {
    override getVersion = mockGetVersion;
    override updateVersion = mockUpdateVersion;
  }
  return { WelcomeUtils: MockWelcomeUtils };
});

const mockOnExtensionToggle = vi.fn();

function renderPage(overrides: Record<string, unknown> = {}): ReturnType<typeof render> {
  return render(OnboardingWelcomePage, {
    props: {
      onExtensionToggle: mockOnExtensionToggle,
      ...overrides,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (onboardingList as ReturnType<typeof writable>).set([]);
  mockGetVersion.mockResolvedValue(undefined);
  mockUpdateVersion.mockResolvedValue(undefined);
  (window as unknown as Record<string, unknown>).getPodmanDesktopVersion = vi.fn().mockResolvedValue('1.2.3');
  (window as unknown as Record<string, unknown>).updateConfigurationValue = vi.fn().mockResolvedValue(undefined);
});

describe('OnboardingWelcomePage', () => {
  test('renders the welcome heading with version', async () => {
    renderPage();

    await vi.waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome to Podman Desktop v1.2.3!');
    });
  });

  test('renders the setup description', () => {
    renderPage();

    expect(screen.getByText(/seamless experience with containers and Kubernetes/)).toBeInTheDocument();
  });

  test('calls updateVersion and releaseNotesBanner on first run', async () => {
    renderPage();

    await vi.waitFor(() => {
      expect(mockUpdateVersion).toHaveBeenCalledWith('initial');
      expect(window.updateConfigurationValue).toHaveBeenCalledWith('releaseNotesBanner.show', '1.2.3');
    });
  });

  test('does not call updateVersion on subsequent runs', async () => {
    mockGetVersion.mockResolvedValue('1.0.0');
    renderPage();

    await vi.waitFor(() => {
      expect(mockGetVersion).toHaveBeenCalled();
    });

    expect(mockUpdateVersion).not.toHaveBeenCalled();
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

  test('calls onExtensionToggle when an extension is toggled', async () => {
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

    const checkbox = await screen.findByRole('checkbox', { name: 'Podman: Integration for Podman' });
    await fireEvent.click(checkbox);

    expect(mockOnExtensionToggle).toHaveBeenCalledWith('podman', false);
  });

  test('exposes getSelectedExtensionIds with checked extensions', async () => {
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
      {
        extension: 'docker',
        name: 'docker',
        displayName: 'Docker',
        icon: '',
        description: 'Docker support',
        steps: [],
        title: 'Docker',
        removable: true,
      },
    ]);

    const { component } = renderPage();

    await vi.waitFor(() => {
      expect(
        (component as unknown as { getSelectedExtensionIds: () => string[] }).getSelectedExtensionIds(),
      ).toEqual(['podman', 'docker']);
    });
  });
});
