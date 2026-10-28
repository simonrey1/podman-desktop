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

import type { ColorInfo } from '@desktop-framework/api';

import { subscribe } from '#lib/api/events.js';

const APPEARANCE_KEY = 'preferences.appearance';

/**
 * Applies the Podman Desktop theme selected in the preferences: its colors become `--pd-*` CSS variables
 * on :root, and the `dark` class is set on <html> for dark themes.
 */
export class ThemeStore {
  isDark = $state(true);
  /** incremented each time the colors are applied, for the components caching them (e.g. the terminals) */
  revision = $state(0);

  #style: HTMLStyleElement | undefined;

  start(): () => void {
    const unsubscribe = subscribe(['color-updated', 'extensions-started'], () => this.refresh());
    const unsubscribeConfiguration = window.events.receive('configuration-changed', event => {
      if (event.key === APPEARANCE_KEY) {
        this.refresh();
      }
    });
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = (): void => this.refresh();
    systemTheme.addEventListener('change', onSystemThemeChange);
    this.refresh();
    return (): void => {
      unsubscribe();
      unsubscribeConfiguration.dispose();
      systemTheme.removeEventListener('change', onSystemThemeChange);
      this.#style?.remove();
    };
  }

  refresh(): void {
    this.#apply().catch((error: unknown) => console.error('Error applying the theme', error));
  }

  async #apply(): Promise<void> {
    const appearance = (await window.getConfigurationValue<string>(APPEARANCE_KEY)) ?? 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let themeId = appearance;
    if (appearance === 'system') {
      themeId = systemDark ? 'dark' : 'light';
    }
    const [colors, info] = await Promise.all([window.listColors(themeId), window.getThemeInfo(themeId)]);
    this.isDark = info.isDark;
    document.documentElement.classList.toggle('dark', info.isDark);
    this.#writeColors(colors);
    this.revision++;
  }

  #writeColors(colors: ColorInfo[]): void {
    this.#style ??= document.head.appendChild(document.createElement('style'));
    this.#style.id = 'podman-desktop-colors';
    const variables = colors.map(color => `${color.cssVar}: ${color.value};`).join('\n');
    this.#style.textContent = `:root {\n${variables}\n}`;
  }
}
