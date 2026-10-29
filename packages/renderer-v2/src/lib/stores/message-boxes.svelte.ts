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

import type { ButtonsType, DialogType } from '@desktop-framework/api';

import { receive } from '#lib/api/events.js';

/** A message box asked by the main process or by an extension (`window.showMessageBox`, `showInformationMessage`...). */
export interface MessageBoxRequest {
  id: number;
  title: string;
  /** markdown */
  message: string;
  detail?: string;
  buttons?: ButtonsType[];
  type?: DialogType;
  defaultId?: number;
  cancelId?: number;
  /** markdown, under the message */
  footerMarkdownDescription?: string;
}

/** A message box to show: its buttons, which one cancels and which one is the default (-1 when none). */
export interface MessageBox {
  request: MessageBoxRequest;
  buttons: ButtonsType[];
  cancelId: number;
  defaultId: number;
  /** the indexes of the buttons in the order shown: the cancel button first, the default one last */
  order: number[];
}

function messageBox(request: MessageBoxRequest): MessageBox {
  const buttons = request.buttons?.length ? request.buttons : ['Dismiss'];
  // the given cancel button, else the one labelled Cancel
  const cancelId =
    request.cancelId !== undefined && request.cancelId >= 0
      ? request.cancelId
      : buttons.findIndex(button => typeof button === 'string' && button.toLowerCase() === 'cancel');
  // the given default button (negative: none), else the first one that does not cancel
  let defaultId: number;
  if (request.defaultId !== undefined && request.defaultId < buttons.length) {
    defaultId = Math.max(request.defaultId, -1);
  } else {
    defaultId = cancelId === 0 ? 1 : 0;
  }
  if (defaultId >= buttons.length) {
    defaultId = -1;
  }
  const others = buttons.map((_, index) => index).filter(index => index !== cancelId && index !== defaultId);
  const order = [
    ...(cancelId >= 0 ? [cancelId] : []),
    ...others,
    ...(defaultId >= 0 && defaultId !== cancelId ? [defaultId] : []),
  ];
  return { request, buttons, cancelId, defaultId, order };
}

/**
 * The message boxes asked by the main process, one at a time (the next ones wait): the shell shows the current one,
 * the answer goes back to the main process.
 */
export class MessageBoxesStore {
  current: MessageBox | undefined = $state.raw();

  readonly #queue: MessageBox[] = [];

  start(): () => void {
    return receive<MessageBoxRequest>('showMessageBox:open', request => {
      const box = messageBox(request);
      if (this.current) {
        this.#queue.push(box);
      } else {
        this.current = box;
      }
    });
  }

  /**
   * @param index the button clicked
   * @param dropdownIndex for a dropdown button, the option chosen
   */
  answer(index: number | undefined, dropdownIndex?: number): void {
    const box = this.current;
    if (!box) {
      return;
    }
    this.current = this.#queue.shift();
    window
      .sendShowMessageBoxOnSelect(box.request.id, index, dropdownIndex)
      .catch((error: unknown) => console.error('Error answering a message box', error));
  }

  /** closed without a button: answered with the cancel button, if any */
  dismiss(): void {
    const box = this.current;
    this.answer(box && box.cancelId >= 0 ? box.cancelId : undefined);
  }
}
