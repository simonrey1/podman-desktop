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

import type { NotificationCard } from '@desktop-framework/api';

import { ListState } from '#lib/stores/list.svelte.js';

/**
 * The notifications of the main process and of the extensions (e.g. an update to install): the highlighted ones
 * show on the dashboard until dismissed.
 */
export class NotificationsStore extends ListState<NotificationCard> {
  readonly highlighted: NotificationCard[] = $derived(this.items.filter(notification => notification.highlight));

  constructor() {
    super(() => window.listNotifications(), ['notifications-updated']);
  }

  dismiss(notification: NotificationCard): void {
    window
      .removeNotification(notification.id)
      .catch((error: unknown) => console.error(`Error dismissing ${notification.title}`, error));
  }
}
