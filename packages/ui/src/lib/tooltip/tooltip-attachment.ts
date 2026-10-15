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

import type { Placement } from '@floating-ui/dom';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { Attachment } from 'svelte/attachments';

import { tooltipHidden } from './tooltip-store';

export interface TooltipOptions {
  placement?: Placement;
}

const TOOLTIP_OUTER_CLASSES =
  'fixed pointer-events-none text-[12px] leading-[16px] z-[9999] rounded-[9px] border-[1px] border-[var(--pd-tooltip-outer-border)] shadow-[0_4px_12px_var(--pd-shadow-color)]';

const TOOLTIP_INNER_CLASSES =
  'pt-[4px] pb-[5px] px-[8px] rounded-[9px] bg-[var(--pd-tooltip-bg)] text-[var(--pd-tooltip-text)] border-[1px] border-[var(--pd-tooltip-inner-border)] backdrop-blur-sm';

const TOOLTIP_CONTENT_STYLES = 'max-width: 400px; word-wrap: break-word; overflow-wrap: anywhere; white-space: normal;';

export function tooltip(tip: string, options?: TooltipOptions): Attachment {
  return (node: Element) => {
    const el = node as HTMLElement;
    const placement: Placement = options?.placement ?? 'top';
    const tooltipId = `pd-tooltip-${crypto.randomUUID()}`;

    let isVisible = false;
    let isHidden = false;
    let tooltipEl: HTMLDivElement | undefined;
    let cleanupAutoUpdate: (() => void) | undefined;

    const unsubscribe = tooltipHidden.subscribe(hidden => {
      isHidden = hidden;
      if (hidden) {
        hide();
      }
    });

    function createTooltipElement(): HTMLDivElement {
      const outer = document.createElement('div');
      outer.className = TOOLTIP_OUTER_CLASSES;
      outer.setAttribute('style', `${TOOLTIP_CONTENT_STYLES} left: 0; top: 0; opacity: 0;`);

      const inner = document.createElement('div');
      inner.className = TOOLTIP_INNER_CLASSES;
      inner.setAttribute('role', 'tooltip');
      inner.id = tooltipId;
      inner.textContent = tip;

      outer.appendChild(inner);
      document.body.appendChild(outer);
      return outer;
    }

    async function updatePosition(): Promise<void> {
      if (!tooltipEl) return;

      const { x, y } = await computePosition(el, tooltipEl, {
        placement,
        middleware: [offset(8), flip({ fallbackAxisSideDirection: 'start', padding: 5 }), shift({ padding: 5 })],
      });

      if (!tooltipEl) return;

      tooltipEl.style.left = `${Math.round(x)}px`;
      tooltipEl.style.top = `${Math.round(y)}px`;

      // Round dimensions to avoid sub-pixel clipping
      tooltipEl.style.width = 'auto';
      const rect = tooltipEl.getBoundingClientRect();
      tooltipEl.style.width = `${Math.ceil(rect.width)}px`;

      tooltipEl.style.opacity = '1';
    }

    function show(): void {
      if (isHidden || !tip) return;
      if (isVisible) return;
      isVisible = true;

      tooltipEl = createTooltipElement();
      el.setAttribute('aria-describedby', tooltipId);

      updatePosition().catch(console.error);
      cleanupAutoUpdate = autoUpdate(el, tooltipEl, () => {
        updatePosition().catch(console.error);
      });
    }

    function hide(): void {
      if (!isVisible) return;
      isVisible = false;

      el.removeAttribute('aria-describedby');

      if (cleanupAutoUpdate) {
        cleanupAutoUpdate();
        cleanupAutoUpdate = undefined;
      }

      if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = undefined;
      }
    }

    function handleFocusOut(event: Event): void {
      const focusEvent = event as FocusEvent;
      if (el.contains(focusEvent.relatedTarget as Node)) return;
      hide();
    }

    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focusin', show);
    el.addEventListener('focusout', handleFocusOut);

    return () => {
      hide();
      unsubscribe();
      el.removeEventListener('mouseenter', show);
      el.removeEventListener('mouseleave', hide);
      el.removeEventListener('focusin', show);
      el.removeEventListener('focusout', handleFocusOut);
    };
  };
}
