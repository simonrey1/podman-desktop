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

import { autoUpdate, computePosition } from '@floating-ui/dom';
import { fireEvent } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { tooltip } from './tooltip-attachment';
import { resetTooltipHideCount } from './tooltip-store';

vi.mock(import('@floating-ui/dom'));

beforeEach(() => {
  vi.mocked(computePosition).mockResolvedValue({
    middlewareData: {},
    placement: 'top',
    strategy: 'absolute',
    x: 100,
    y: 200,
  });

  vi.mocked(autoUpdate).mockImplementation((_ref, _tooltip, update) => {
    update();
    return (): void => {};
  });

  resetTooltipHideCount();
  vi.clearAllMocks();
});

function createButton(text = 'Click me'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = text;
  document.body.appendChild(btn);
  return btn;
}

function cleanupBody(): void {
  document.body.innerHTML = '';
}

describe('tooltip attachment', () => {
  beforeEach(() => {
    cleanupBody();
  });

  test('shows tooltip on mouseenter and hides on mouseleave', async () => {
    const btn = createButton();
    const cleanup = tooltip('Hello tooltip')(btn);

    await fireEvent.mouseEnter(btn);
    expect(document.querySelector('[role="tooltip"]')).toBeInTheDocument();
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Hello tooltip');

    await fireEvent.mouseLeave(btn);
    expect(document.querySelector('[role="tooltip"]')).not.toBeInTheDocument();

    cleanup?.();
  });

  test('shows tooltip on focusin and hides on focusout', async () => {
    const btn = createButton();
    const cleanup = tooltip('Focus tooltip')(btn);

    await fireEvent.focusIn(btn);
    expect(document.querySelector('[role="tooltip"]')).toBeInTheDocument();

    await fireEvent.focusOut(btn);
    expect(document.querySelector('[role="tooltip"]')).not.toBeInTheDocument();

    cleanup?.();
  });

  test('sets aria-describedby on the element when visible', async () => {
    const btn = createButton();
    const cleanup = tooltip('Aria tooltip')(btn);

    await fireEvent.mouseEnter(btn);
    const tooltipEl = document.querySelector('[role="tooltip"]');
    expect(tooltipEl).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-describedby', tooltipEl!.id);
    expect(tooltipEl!.id).toMatch(/^pd-tooltip-/);

    await fireEvent.mouseLeave(btn);
    expect(btn).not.toHaveAttribute('aria-describedby');

    cleanup?.();
  });

  test('uses default top placement', async () => {
    const btn = createButton();
    const cleanup = tooltip('Top tooltip')(btn);

    await fireEvent.mouseEnter(btn);

    expect(computePosition).toHaveBeenCalledWith(btn, expect.anything(), expect.objectContaining({ placement: 'top' }));

    cleanup?.();
  });

  test('respects custom placement option', async () => {
    const btn = createButton();
    const cleanup = tooltip('Bottom tooltip', { placement: 'bottom' })(btn);

    await fireEvent.mouseEnter(btn);

    expect(computePosition).toHaveBeenCalledWith(
      btn,
      expect.anything(),
      expect.objectContaining({ placement: 'bottom' }),
    );

    cleanup?.();
  });

  test('calls autoUpdate when tooltip is shown', async () => {
    const btn = createButton();
    const cleanup = tooltip('Auto update')(btn);

    await fireEvent.mouseEnter(btn);
    expect(autoUpdate).toHaveBeenCalled();

    cleanup?.();
  });

  test('tooltip has correct styling classes', async () => {
    const btn = createButton();
    const cleanup = tooltip('Styled tooltip')(btn);

    await fireEvent.mouseEnter(btn);

    const inner = document.querySelector('[role="tooltip"]');
    expect(inner).toHaveClass('bg-[var(--pd-tooltip-bg)]');
    expect(inner).toHaveClass('text-[var(--pd-tooltip-text)]');
    expect(inner).toHaveClass('border-[var(--pd-tooltip-inner-border)]');
    expect(inner).toHaveClass('backdrop-blur-sm');

    cleanup?.();
  });

  test('tooltip outer element has correct z-index', async () => {
    const btn = createButton();
    const cleanup = tooltip('Z-index test')(btn);

    await fireEvent.mouseEnter(btn);

    const outer = document.querySelector('[role="tooltip"]')?.parentElement;
    expect(outer).toHaveClass('z-[9999]');

    cleanup?.();
  });

  test('hides tooltip when tooltipHidden store becomes true', async () => {
    const btn = createButton();
    const cleanup = tooltip('Hidden tooltip')(btn);

    await fireEvent.mouseEnter(btn);
    expect(document.querySelector('[role="tooltip"]')).toBeInTheDocument();

    window.dispatchEvent(new Event('tooltip-hide'));

    expect(document.querySelector('[role="tooltip"]')).not.toBeInTheDocument();

    cleanup?.();
  });

  test('does not show tooltip when tooltipHidden is true', async () => {
    window.dispatchEvent(new Event('tooltip-hide'));

    const btn = createButton();
    const cleanup = tooltip('Blocked tooltip')(btn);

    await fireEvent.mouseEnter(btn);
    expect(document.querySelector('[role="tooltip"]')).not.toBeInTheDocument();

    window.dispatchEvent(new Event('tooltip-show'));
    cleanup?.();
  });

  test('does not show tooltip for empty tip', async () => {
    const btn = createButton();
    const cleanup = tooltip('')(btn);

    await fireEvent.mouseEnter(btn);
    expect(document.querySelector('[role="tooltip"]')).not.toBeInTheDocument();

    cleanup?.();
  });

  test('cleanup removes event listeners and tooltip', async () => {
    const btn = createButton();
    const cleanup = tooltip('Cleanup test')(btn);

    await fireEvent.mouseEnter(btn);
    expect(document.querySelector('[role="tooltip"]')).toBeInTheDocument();

    cleanup?.();
    expect(document.querySelector('[role="tooltip"]')).not.toBeInTheDocument();
    expect(btn).not.toHaveAttribute('aria-describedby');
  });

  test('each tooltip gets a unique id', async () => {
    const btn1 = createButton('Button 1');
    const btn2 = createButton('Button 2');

    const cleanup1 = tooltip('First')(btn1);
    const cleanup2 = tooltip('Second')(btn2);

    await fireEvent.mouseEnter(btn1);
    await fireEvent.mouseEnter(btn2);

    const tooltips = document.querySelectorAll('[role="tooltip"]');
    expect(tooltips).toHaveLength(2);
    expect(tooltips[0]!.id).not.toBe(tooltips[1]!.id);

    cleanup1?.();
    cleanup2?.();
  });

  test('focusout does not hide when focus moves within the element', async () => {
    const container = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = 'Inner button';
    container.appendChild(btn);
    document.body.appendChild(container);

    const cleanup = tooltip('Stay visible')(container);

    await fireEvent.focusIn(container);
    expect(document.querySelector('[role="tooltip"]')).toBeInTheDocument();

    await fireEvent.focusOut(container, { relatedTarget: btn });
    expect(document.querySelector('[role="tooltip"]')).toBeInTheDocument();

    cleanup?.();
  });
});
