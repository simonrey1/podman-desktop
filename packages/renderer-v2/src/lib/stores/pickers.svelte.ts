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

import { receive } from '#lib/api/events.js';

/** An item of a quick pick: a label, or a label with a description and a detail. */
export type QuickPickItem = string | { label: string; description?: string; detail?: string };

/** A quick pick asked by an extension (`window.showQuickPick`). */
export interface QuickPickRequest {
  id: number;
  title?: string;
  placeHolder?: string;
  prompt?: string;
  items: QuickPickItem[];
  canPickMany: boolean;
  /** the main process is told the item highlighted, as it changes */
  onSelectCallback: boolean;
  /** clicking outside does not close it */
  ignoreFocusOut?: boolean;
}

/** An input box asked by an extension (`window.showInputBox`). */
export interface InputBoxRequest {
  id: number;
  title?: string;
  placeHolder?: string;
  prompt?: string;
  /** markdown, under the input */
  markdownDescription?: string;
  value?: string;
  /** the part of the value selected at first */
  valueSelection?: [number, number];
  /** the value is validated by the extension as it is typed */
  validate: boolean;
  multiline: boolean;
  password?: boolean;
  ignoreFocusOut?: boolean;
}

/** A card of a custom pick: markdown content, and sections of details. */
export interface CustomPickItem {
  title: string;
  description?: string;
  markDownContent: string;
  sections?: { title: string; content?: string; markDownContent?: string }[];
  selected?: boolean;
}

/** A custom pick asked by an extension (`window.createCustomPick`): cards to select, then Next. */
export interface CustomPickRequest {
  id: number;
  title?: string;
  description?: string;
  /** the address of an image, one per theme or for both */
  icon?: string | { light: string; dark: string };
  items: CustomPickItem[];
  canSelectMany: boolean;
  /** the sections of the cards are folded */
  hideItemSections: boolean;
  /** the minimum height of the cards, as CSS */
  minHeight?: string;
  /** never sent: a custom pick closes on a click outside */
  ignoreFocusOut?: boolean;
}

export type Picker =
  | { kind: 'quick-pick'; request: QuickPickRequest }
  | { kind: 'input-box'; request: InputBoxRequest }
  | { kind: 'custom-pick'; request: CustomPickRequest };

/**
 * The quick picks and the input boxes asked by the extensions, one at a time (the next ones wait): the shell shows
 * the current one, the answer goes back to the main process.
 */
export class PickersStore {
  current: Picker | undefined = $state.raw();

  readonly #queue: Picker[] = [];

  start(): () => void {
    const stops = [
      receive<QuickPickRequest>('showQuickPick:add', request => this.#show({ kind: 'quick-pick', request })),
      receive<InputBoxRequest>('showInputBox:add', request => this.#show({ kind: 'input-box', request })),
      receive<CustomPickRequest>('showCustomPick:add', request => this.#show({ kind: 'custom-pick', request })),
    ];
    return (): void => stops.forEach(stop => stop());
  }

  #show(picker: Picker): void {
    if (this.current) {
      this.#queue.push(picker);
    } else {
      this.current = picker;
    }
  }

  #next(): Picker | undefined {
    const picker = this.current;
    this.current = this.#queue.shift();
    return picker;
  }

  /** @param indexes the items picked: none when cancelled */
  pick(indexes: number[] | undefined): void {
    const picker = this.#next();
    if (picker?.kind === 'quick-pick') {
      window
        .sendShowQuickPickValues(picker.request.id, indexes)
        .catch((error: unknown) => console.error('Error answering a quick pick', error));
    }
  }

  /** @param value the value entered: none when cancelled */
  enter(value: string | undefined): void {
    const picker = this.#next();
    if (picker?.kind === 'input-box') {
      window
        .sendShowInputBoxValue(picker.request.id, value)
        .catch((error: unknown) => console.error('Error answering an input box', error));
    }
  }

  /** closed without an answer */
  cancel(): void {
    const kind = this.current?.kind;
    if (kind === 'quick-pick') {
      this.pick(undefined);
    } else if (kind === 'input-box') {
      this.enter(undefined);
    } else if (kind === 'custom-pick') {
      this.choose(undefined);
    }
  }

  /** @param indexes the cards selected: none when cancelled */
  choose(indexes: number[] | undefined): void {
    const picker = this.#next();
    if (picker?.kind !== 'custom-pick') {
      return;
    }
    const id = picker.request.id;
    (indexes ? window.sendCustomPickItemsOnConfirmation(id, indexes) : Promise.resolve())
      .then(() => window.closeCustomPick(id))
      .catch((error: unknown) => console.error('Error answering a custom pick', error));
  }

  /** tells the main process the item highlighted, when it asked for it */
  highlight(index: number): void {
    const picker = this.current;
    if (picker?.kind === 'quick-pick' && picker.request.onSelectCallback) {
      window
        .sendShowQuickPickOnSelect(picker.request.id, index)
        .catch((error: unknown) => console.error('Error telling the item highlighted', error));
    }
  }

  /** @returns the message of the extension when the value is not valid */
  async validate(value: string): Promise<string | undefined> {
    const picker = this.current;
    if (picker?.kind !== 'input-box' || !picker.request.validate) {
      return undefined;
    }
    const result = await window.sendShowInputBoxValidate(picker.request.id, value);
    if (!result) {
      return undefined;
    }
    return typeof result === 'string' ? result : result.message;
  }
}
