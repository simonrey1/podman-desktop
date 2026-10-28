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

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "3 hours", "2 weeks"... from a date, or a timestamp in seconds */
export function age(date: Date | string | number | undefined): string {
  if (date === undefined) {
    return '';
  }
  const time = typeof date === 'number' ? date * 1000 : new Date(date).getTime();
  const seconds = Math.max(0, (Date.now() - time) / 1000);
  if (Number.isNaN(seconds)) {
    return '';
  }
  for (const [unit, unitSeconds] of UNITS) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) {
      return `${value} ${unit}${value > 1 ? 's' : ''}`;
    }
  }
  return 'seconds';
}

const SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB'];

/** "1.2 GB" from a size in bytes */
export function bytes(size: number): string {
  let value = size;
  let unit = 0;
  while (value >= 1000 && unit < SIZE_UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${SIZE_UNITS[unit]}`;
}
