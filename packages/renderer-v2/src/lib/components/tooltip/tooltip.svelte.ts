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

import type { Attachment } from 'svelte/attachments';

/**
 * The tooltip of the application: one tooltip element for all, shown by the element hovered or focused with the
 * keyboard. An element only gets listeners (no component, no portal): a list of hundreds of buttons stays cheap.
 */
class TooltipState {
  text = $state('');
  /** the element showing it */
  anchor: HTMLElement | undefined = $state.raw();

  show(anchor: HTMLElement, text: string): void {
    this.anchor = anchor;
    this.text = text;
  }

  hide(anchor: HTMLElement): void {
    if (this.anchor === anchor) {
      this.anchor = undefined;
    }
  }
}

export const tooltipState = new TooltipState();

/** shows the text in the tooltip while the element is hovered, or focused with the keyboard */
export function tooltip(text: string | undefined): Attachment<HTMLElement> {
  return element => {
    if (!text) {
      return;
    }
    const show = (): void => tooltipState.show(element, text);
    const hide = (): void => tooltipState.hide(element);
    const focus = (): void => {
      if (element.matches(':focus-visible')) {
        show();
      }
    };
    element.addEventListener('pointerenter', show);
    element.addEventListener('pointerleave', hide);
    element.addEventListener('pointerdown', hide);
    element.addEventListener('focusin', focus);
    element.addEventListener('focusout', hide);
    // the text changed while shown
    if (tooltipState.anchor === element) {
      show();
    }
    return (): void => {
      element.removeEventListener('pointerenter', show);
      element.removeEventListener('pointerleave', hide);
      element.removeEventListener('pointerdown', hide);
      element.removeEventListener('focusin', focus);
      element.removeEventListener('focusout', hide);
      hide();
    };
  };
}
