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
import { mount, unmount } from 'svelte';
import type { Attachment } from 'svelte/attachments';

import { tooltipHidden } from './tooltip-store';
import TooltipPopup, { nextTooltipId } from './TooltipPopup.svelte';

export interface TooltipOptions {
  placement?: Placement;
}

export function tooltip(tip: string, options?: TooltipOptions): Attachment {
  return (node: Element) => {
    const el = node as HTMLElement;
    const tooltipId = nextTooltipId();

    let isHidden = false;
    let popup: ReturnType<typeof mount> | undefined;

    const unsubscribe = tooltipHidden.subscribe(hidden => {
      isHidden = hidden;
      if (hidden) {
        hide();
      }
    });

    function show(): void {
      if (isHidden || !tip || popup) return;

      popup = mount(TooltipPopup, {
        target: document.body,
        props: { reference: el, id: tooltipId, placement: options?.placement ?? 'top', tip },
      });
      el.setAttribute('aria-describedby', tooltipId);
    }

    function hide(): void {
      if (!popup) return;

      el.removeAttribute('aria-describedby');
      unmount(popup).catch(console.error);
      popup = undefined;
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
