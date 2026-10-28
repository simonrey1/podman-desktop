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

/**
 * Opens an xterm terminal in the element, using the terminal colors of the theme, and fits it to the element size.
 * @returns the terminal and a function disposing it
 */
export function openTerminal(
  element: HTMLElement,
  options: { disableStdin: boolean },
): {
  terminal: Terminal;
  dispose: () => void;
} {
  const terminal = new Terminal({
    fontSize: 12,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
    lineHeight: 1.2,
    scrollback: 5000,
    disableStdin: options.disableStdin,
    cursorBlink: !options.disableStdin,
    theme: terminalTheme(),
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

  return {
    terminal,
    dispose: (): void => {
      observer.disconnect();
      terminal.dispose();
    },
  };
}
