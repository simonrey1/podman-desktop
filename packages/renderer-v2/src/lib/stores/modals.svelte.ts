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

import type { Component } from 'svelte';

/** What every modal receives: closing it (once done, or cancelled). */
export interface ModalProps {
  onClose: () => void;
}

type AnyModal = Component<ModalProps & Record<string, unknown>>;

/**
 * The modal opened by an action (e.g. Push of an image), one at a time: the shell renders it, with its props.
 */
export class ModalsStore {
  current: { component: AnyModal; props: Record<string, unknown> } | undefined = $state.raw();

  open<P extends ModalProps>(component: Component<P>, props: Omit<P, 'onClose'>): void {
    this.current = { component: component as unknown as AnyModal, props };
  }

  close(): void {
    this.current = undefined;
  }
}
