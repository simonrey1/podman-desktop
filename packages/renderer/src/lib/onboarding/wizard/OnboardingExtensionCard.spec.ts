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
import { describe, expect, test, vi } from 'vitest';

import OnboardingExtensionCard from './OnboardingExtensionCard.svelte';

describe('OnboardingExtensionCard', () => {
  const onToggle = vi.fn();

  test('renders display name and description', () => {
    render(OnboardingExtensionCard, {
      displayName: 'Podman',
      description: 'Integration for Podman and Podman Machines',
      checked: true,
      onToggle,
    });

    expect(screen.getByText('Podman')).toBeInTheDocument();
    expect(screen.getByText('Integration for Podman and Podman Machines')).toBeInTheDocument();
  });

  test('renders checkbox with correct title', () => {
    render(OnboardingExtensionCard, {
      displayName: 'Podman',
      checked: true,
      onToggle,
    });

    expect(screen.getByRole('checkbox', { name: 'Podman checkbox' })).toBeInTheDocument();
  });

  test('checkbox reflects checked prop', () => {
    render(OnboardingExtensionCard, {
      displayName: 'Podman',
      checked: true,
      onToggle,
    });

    expect(screen.getByRole('checkbox', { name: 'Podman checkbox' })).toBeChecked();
  });

  test('toggles checked state on click', async () => {
    const toggle = vi.fn();
    render(OnboardingExtensionCard, {
      displayName: 'Podman',
      checked: true,
      onToggle: toggle,
    });

    const button = screen.getByRole('button');
    await fireEvent.click(button);

    expect(toggle).toHaveBeenCalledWith(false);
  });

  test('applies checked border style when checked', () => {
    render(OnboardingExtensionCard, {
      displayName: 'Podman',
      checked: true,
      onToggle,
    });

    const button = screen.getByRole('button');
    expect(button.className).toContain('border-(--pd-content-card-border-selected)');
  });

  test('applies default border style when not checked', () => {
    render(OnboardingExtensionCard, {
      displayName: 'Podman',
      checked: false,
      onToggle,
    });

    const button = screen.getByRole('button');
    expect(button.className).not.toContain('border-(--pd-content-card-border-selected)');
  });
});
