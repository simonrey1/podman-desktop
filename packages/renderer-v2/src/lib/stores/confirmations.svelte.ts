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

/** A question asked to the user before doing something that cannot be undone. */
export interface ConfirmationRequest {
  title: string;
  message: string;
  /** the label of the button confirming, e.g. "Delete" */
  confirmLabel: string;
  /** the confirm button is red */
  destructive?: boolean;
}

/**
 * The confirmations asked to the user, one at a time: the shell shows the current one in a dialog.
 */
export class ConfirmationsStore {
  current: ConfirmationRequest | undefined = $state.raw();

  #resolve: ((confirmed: boolean) => void) | undefined;

  /** @returns whether the user confirmed */
  ask(request: ConfirmationRequest): Promise<boolean> {
    // a new question replaces the one still open: the previous one is answered no
    this.answer(false);
    return new Promise(resolve => {
      this.current = request;
      this.#resolve = resolve;
    });
  }

  answer(confirmed: boolean): void {
    const resolve = this.#resolve;
    this.#resolve = undefined;
    this.current = undefined;
    resolve?.(confirmed);
  }
}
