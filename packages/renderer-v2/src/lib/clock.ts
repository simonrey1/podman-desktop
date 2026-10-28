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

import { createSubscriber } from 'svelte/reactivity';

// ages are shown to the minute: refreshed twice a minute
const INTERVAL = 30_000;

/**
 * The current time, for the ages and uptimes: reading `clock.now` in a template or a derived re-runs it every 30
 * seconds, the timer running only while something reads it.
 */
class Clock {
  readonly #subscribe = createSubscriber(update => {
    const timer = setInterval(update, INTERVAL);
    return (): void => clearInterval(timer);
  });

  get now(): number {
    this.#subscribe();
    return Date.now();
  }
}

export const clock = new Clock();
