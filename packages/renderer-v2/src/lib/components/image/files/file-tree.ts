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

import type { FilesystemNode } from '@desktop-framework/api';
import type { ImageFile, ImageFileSymlink } from '@podman-desktop/api';

/** A line of the file tree: a node, at its depth, shown because its parents are expanded. */
export interface FileLine {
  /** the path of the node from the root, e.g. `/usr/bin` */
  path: string;
  node: FilesystemNode<ImageFile>;
  depth: number;
  directory: boolean;
}

/** a directory: a node with children, or a file of the directory type */
export function isDirectory(node: FilesystemNode<ImageFile>): boolean {
  return node.isDirectory || node.children.size > 0 || node.data?.type === 'directory';
}

/** the children of a node: the directories first, then by name */
function sortedChildren(node: FilesystemNode<ImageFile>): FilesystemNode<ImageFile>[] {
  return [...node.children.values()].toSorted(
    (a, b) => Number(isDirectory(b)) - Number(isDirectory(a)) || a.name.localeCompare(b.name),
  );
}

/** the lines shown: the children of the root, and the children of the expanded directories */
export function visibleLines(root: FilesystemNode<ImageFile>, expanded: ReadonlySet<string>): FileLine[] {
  const lines: FileLine[] = [];
  const visit = (node: FilesystemNode<ImageFile>, parent: string, depth: number): void => {
    for (const child of sortedChildren(node)) {
      const path = `${parent}/${child.name}`;
      const directory = isDirectory(child);
      lines.push({ path, node: child, depth, directory });
      if (directory && expanded.has(path)) {
        visit(child, path, depth + 1);
      }
    }
  };
  visit(root, '', 0);
  return lines;
}

/** e.g. `drwxr-xr-x`, with the setuid, setgid and sticky bits */
export function modeString(file: ImageFile): string {
  const { mode } = file;
  const bit = (mask: number, letter: string): string => (mode & mask ? letter : '-');
  const special = (mask: number, exec: number, set: string, unset: string, plain: string): string => {
    if (mode & mask) {
      return mode & exec ? set : unset;
    }
    return mode & exec ? plain : '-';
  };
  return (
    (file.type === 'directory' ? 'd' : '-') +
    bit(0o400, 'r') +
    bit(0o200, 'w') +
    special(0o4000, 0o100, 's', 'S', 'x') +
    bit(0o040, 'r') +
    bit(0o020, 'w') +
    special(0o2000, 0o010, 's', 'S', 'x') +
    bit(0o004, 'r') +
    bit(0o002, 'w') +
    special(0o1000, 0o001, 't', 'T', 'x')
  );
}

/** the target of a symbolic link, else nothing */
export function linkTarget(file: ImageFile | undefined): string | undefined {
  return file?.type === 'symlink' ? (file as ImageFileSymlink).linkPath : undefined;
}

/** an executable file (one of its execute bits set) */
export function isExecutable(file: ImageFile | undefined): boolean {
  return file?.type === 'file' && (file.mode & 0o111) !== 0;
}
