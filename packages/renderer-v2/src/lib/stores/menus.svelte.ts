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

import type { Menu } from '@desktop-framework/api';
import { MenuContext } from '@desktop-framework/api';

import { ListState } from '#lib/stores/list.svelte.js';

/** The actions contributed by the extensions (`contributes.menus`), by the kind of resource they apply to. */
export class MenusStore extends ListState<{ context: MenuContext; menus: Menu[] }> {
  constructor() {
    super(
      () =>
        Promise.all(
          Object.values(MenuContext).map(async context => ({
            context,
            menus: await window.getContributedMenus(context),
          })),
        ),
      ['extension-started', 'extension-stopped', 'extensions-started', 'extensions-updated'],
    );
  }

  of(context: MenuContext): Menu[] {
    return this.items.find(item => item.context === context)?.menus ?? [];
  }
}
