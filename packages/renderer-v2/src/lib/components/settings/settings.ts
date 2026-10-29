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

import type { Setting } from '#lib/stores/configuration.svelte.js';

/** The control of a setting, from its type and its format (unsupported: not shown, e.g. an array). */
export type SettingKind =
  | 'boolean'
  | 'number'
  | 'enum'
  | 'string'
  | 'password'
  | 'file'
  | 'folder'
  | 'markdown'
  | 'unsupported';

export function settingKind(setting: Setting): SettingKind {
  const type = Array.isArray(setting.type) ? setting.type[0] : setting.type;
  switch (type) {
    case 'boolean':
      return 'boolean';
    // an experimental feature: enabled with an object, disabled with false
    case 'object':
      return setting.experimental ? 'boolean' : 'unsupported';
    case 'number':
    case 'integer':
      return 'number';
    case 'markdown':
      return 'markdown';
    case 'string':
      if (setting.enum?.length) {
        return 'enum';
      }
      if (setting.format === 'password') {
        return 'password';
      }
      if (setting.format === 'file' || setting.format === 'folder') {
        return setting.format;
      }
      return 'string';
    default:
      return 'unsupported';
  }
}

/** the label of a setting: its display name, else the end of its id in words (e.g. `zoomLevel` → `Zoom level`) */
export function settingLabel(setting: Setting): string {
  if (setting.displayName) {
    return setting.displayName;
  }
  const last = setting.id.substring(setting.id.lastIndexOf('.') + 1);
  const words = last.replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** the default value of a setting, a number kept under its maximum */
export function defaultValue(setting: Setting): unknown {
  if (typeof setting.maximum === 'number' && typeof setting.default === 'number') {
    return Math.min(setting.default, setting.maximum);
  }
  return setting.default;
}

/** whether the value of a setting is not its default (a setting without a default is never modified) */
export function isModified(setting: Setting, value: unknown): boolean {
  if (setting.default === undefined) {
    return false;
  }
  return JSON.stringify(value ?? null) !== JSON.stringify(defaultValue(setting) ?? null);
}

/** the error of a number typed for a setting, else nothing */
export function validateNumber(setting: Setting, text: string): string | undefined {
  if (text.trim() === '' || Number.isNaN(Number(text))) {
    return 'A number is expected';
  }
  const value = Number(text);
  if ((Array.isArray(setting.type) ? setting.type[0] : setting.type) === 'integer' && !Number.isInteger(value)) {
    return 'A whole number is expected';
  }
  if (setting.minimum !== undefined && value < setting.minimum) {
    return `The minimum is ${setting.minimum}`;
  }
  if (typeof setting.maximum === 'number' && value > setting.maximum) {
    return `The maximum is ${setting.maximum}`;
  }
  return undefined;
}

/** whether a setting matches the text searched: its label, its id, its description */
export function matchesSetting(setting: Setting, query: string): boolean {
  const text = query.trim().toLowerCase();
  return (
    !text ||
    [settingLabel(setting), setting.id, setting.title, setting.description, setting.markdownDescription].some(field =>
      field?.toLowerCase().includes(text),
    )
  );
}
