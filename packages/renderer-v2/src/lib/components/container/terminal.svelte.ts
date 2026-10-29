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

import '@xterm/xterm/css/xterm.css';

import { FitAddon } from '@xterm/addon-fit';
import { type ITheme, Terminal } from '@xterm/xterm';
import { untrack } from 'svelte';

import type { App } from '#lib/app.svelte.js';

function cssVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** The terminal colors of the current theme. */
export function terminalTheme(): ITheme {
  return {
    background: cssVariable('--pd-terminal-background'),
    foreground: cssVariable('--pd-terminal-foreground'),
    cursor: cssVariable('--pd-terminal-cursor'),
    // neutral, visible on the dark and on the light terminals
    scrollbarSliderBackground: 'rgba(128, 128, 128, 0.25)',
    scrollbarSliderHoverBackground: 'rgba(128, 128, 128, 0.4)',
    scrollbarSliderActiveBackground: 'rgba(128, 128, 128, 0.55)',
  };
}

/** the settings of the terminals, and the look of the terminals of v2 while a setting keeps its default */
const SETTINGS = [
  { key: 'terminal.integrated.fontSize', option: 'fontSize', v2: 12 },
  { key: 'terminal.integrated.lineHeight', option: 'lineHeight', v2: 1.2 },
  { key: 'terminal.integrated.scrollback', option: 'scrollback', v2: 5000 },
] as const;

/**
 * The font size, the line height and the scrollback of the terminals: a setting changed by the user, else the look of
 * v2 (the defaults of the settings are the small terminals of v1).
 */
export function terminalSettings(app: App): Record<(typeof SETTINGS)[number]['option'], number> {
  const entries = SETTINGS.map(({ key, option, v2 }) => {
    const value = app.configuration.value(key);
    const setting = app.configuration.items.find(item => item.id === key);
    return [option, typeof value === 'number' && value !== setting?.default ? value : v2] as const;
  });
  return Object.fromEntries(entries) as Record<(typeof SETTINGS)[number]['option'], number>;
}

/**
 * Opens an xterm terminal in the element, using the terminal colors of the theme and the terminal settings (followed
 * as they change), and fits it to the element size. Called in an effect or an attachment.
 * @returns the terminal and a function disposing it
 */
export function openTerminal(
  element: HTMLElement,
  options: { disableStdin: boolean },
  app: App,
): {
  terminal: Terminal;
  dispose: () => void;
} {
  const terminal = new Terminal({
    ...untrack(() => terminalSettings(app)),
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
    disableStdin: options.disableStdin,
    cursorBlink: !options.disableStdin,
    theme: terminalTheme(),
    // the highlights of the search are decorations, a proposed API of xterm
    allowProposedApi: true,
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(element);

  // the panel and the session tabs can be resized or hidden: fit only when the element is visible
  const observer = new ResizeObserver(() => {
    if (element.clientWidth > 0 && element.clientHeight > 0) {
      fitAddon.fit();
    }
  });
  observer.observe(element);

  // a setting changed: applied to the terminal open, then the terminal fits again
  $effect(() => {
    const settings = terminalSettings(app);
    if (SETTINGS.some(({ option }) => terminal.options[option] !== settings[option])) {
      Object.assign(terminal.options, settings);
      if (element.clientWidth > 0 && element.clientHeight > 0) {
        fitAddon.fit();
      }
    }
  });

  return {
    terminal,
    dispose: (): void => {
      observer.disconnect();
      terminal.dispose();
    },
  };
}
