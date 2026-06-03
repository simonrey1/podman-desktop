import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import OnboardingWelcomeSetupMode from './OnboardingWelcomeSetupMode.svelte';

describe('OnboardingWelcomeSetupMode', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'getPodmanDesktopVersion', {
      value: vi.fn().mockResolvedValue('1.2.3'),
      configurable: true,
    });
    Object.defineProperty(window, 'getTelemetryMessages', {
      value: vi.fn().mockResolvedValue({
        acceptMessage: 'Telemetry message',
        privacy: { link: 'Privacy statement', url: 'https://example.test/privacy' },
      }),
      configurable: true,
    });
    Object.defineProperty(window, 'openExternal', { value: vi.fn(), configurable: true });
  });

  test('renders welcome heading with setup mode options', async () => {
    render(OnboardingWelcomeSetupMode, { extensionId: 'podman' });

    expect(await screen.findByText('Welcome to Podman Desktop v1.2.3!')).toBeInTheDocument();
    expect(screen.getByLabelText('Use recommended setup')).toBeInTheDocument();
    expect(screen.getByLabelText('Use advanced setup')).toBeInTheDocument();
  });

  test('reveals advanced controls when advanced mode is selected', async () => {
    render(OnboardingWelcomeSetupMode, { extensionId: 'podman' });
    await fireEvent.click(screen.getByLabelText('Use advanced setup'));

    expect(screen.getByText('Container engine')).toBeInTheDocument();
    expect(screen.getByText('kubectl')).toBeInTheDocument();
    expect(screen.getByText('compose')).toBeInTheDocument();
  });
});
