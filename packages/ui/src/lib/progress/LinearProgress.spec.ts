/**********************************************************************
 * Copyright (C) 2024-2026 Red Hat, Inc.
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

import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import LinearProgress from './LinearProgress.svelte';

describe('indeterminate mode', () => {
  test('should render without value attribute when value is undefined', () => {
    render(LinearProgress);

    const progress = screen.getByRole('progressbar');
    expect(progress).toBeInTheDocument();
    expect(progress).not.toHaveAttribute('value');
  });

  test('should not set max attribute when value is undefined', () => {
    render(LinearProgress);

    const progress = screen.getByRole('progressbar');
    expect(progress).not.toHaveAttribute('max');
  });
});

describe('determinate mode', () => {
  test('should set value and max attributes when value is provided', () => {
    render(LinearProgress, { value: 50 });

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('value', '50');
    expect(progress).toHaveAttribute('max', '100');
  });

  test('should handle zero value', () => {
    render(LinearProgress, { value: 0 });

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('value', '0');
    expect(progress).toHaveAttribute('max', '100');
  });

  test('should handle full value', () => {
    render(LinearProgress, { value: 100 });

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('value', '100');
    expect(progress).toHaveAttribute('max', '100');
  });
});

describe('prop propagation', () => {
  test('should apply default classes when no class is provided', () => {
    render(LinearProgress);

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveClass('w-full');
    expect(progress).toHaveClass('h-0.5');
    expect(progress).toHaveClass('text-purple-500');
  });

  test('should apply custom class when provided', () => {
    render(LinearProgress, { class: 'w-20 h-1 text-green-500' });

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveClass('w-20');
    expect(progress).toHaveClass('h-1');
    expect(progress).toHaveClass('text-green-500');
    expect(progress).not.toHaveClass('w-full');
  });

  test('should propagate style attribute', () => {
    render(LinearProgress, { style: '--pd-linear-progress-track: red;' });

    const progress = screen.getByRole('progressbar');
    expect(progress.getAttribute('style')).toBe('--pd-linear-progress-track: red;');
  });
});
