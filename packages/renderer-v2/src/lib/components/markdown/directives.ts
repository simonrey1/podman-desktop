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

import type { Directive, Handle, HtmlOptions } from 'micromark-extension-directive';

type CompileContext = ThisParameterType<Handle>;

/**
 * `:image[alt]{src=... title=... width=... height=...}`: an image, from a data URL or an https address.
 */
function image(this: CompileContext, directive: Directive): boolean {
  const src = directive.attributes?.src;
  if (directive.type !== 'textDirective' || !src || !/^(data:image\/|https:)/.test(src)) {
    return false;
  }
  this.tag(`<img src="${this.encode(src)}" alt="${directive.label ?? ''}"`);
  for (const attribute of ['title', 'width', 'height'] as const) {
    const value = directive.attributes?.[attribute];
    if (value) {
      this.tag(` ${attribute}="${this.encode(value)}"`);
    }
  }
  this.tag(' class="markdown-image">');
  return true;
}

/** the attribute of an element, if the directive has it */
function attribute(this: CompileContext, name: string, value: string | null | undefined): void {
  if (value) {
    this.tag(` ${name}="${this.encode(value)}"`);
  }
}

/**
 * `:button[label]{command=... args=...}`: a button running a command of the main process or of an extension;
 * `:button[label]{href=...}`: a link looking like a button.
 */
function button(this: CompileContext, directive: Directive): boolean {
  const { command, args, href, title } = directive.attributes ?? {};
  if (directive.type !== 'textDirective' || (!command && !href)) {
    return false;
  }
  if (command) {
    this.tag('<button type="button" class="markdown-button"');
    attribute.call(this, 'data-command', command);
    attribute.call(this, 'data-args', args);
  } else {
    this.tag('<a class="markdown-button"');
    attribute.call(this, 'href', href);
  }
  attribute.call(this, 'title', title);
  this.tag('>');
  this.raw(directive.label ?? '');
  this.tag(command ? '</button>' : '</a>');
  return true;
}

/** `:link[label]{command=...}`: a link running a command; `:link[label]{href=...}`: a link */
function link(this: CompileContext, directive: Directive): boolean {
  const { command, href, title } = directive.attributes ?? {};
  if (directive.type !== 'textDirective' || (!command && !href)) {
    return false;
  }
  this.tag('<a');
  attribute.call(this, command ? 'data-command' : 'href', command ?? href);
  attribute.call(this, 'title', title);
  this.tag('>');
  this.raw(directive.label ?? '');
  this.tag('</a>');
  return true;
}

/** the directives not handled yet (e.g. the warnings of an onboarding): their label, or their content */
function fallback(this: CompileContext, directive: Directive): boolean {
  this.raw(directive.label ?? '');
  this.raw(directive.content ?? '');
  return true;
}

/** The directives of the markdown of Podman Desktop and of its extensions. */
export const directiveHandlers: HtmlOptions = { button, image, link, '*': fallback };
