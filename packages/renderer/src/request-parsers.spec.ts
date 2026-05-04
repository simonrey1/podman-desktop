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

import { expect, test } from 'vitest';

import {
  parseIdEngineIdAndBase64RepoTag,
  parseName,
  parseNameAndEngineId,
  parseNameAndNamespace,
} from './request-parsers';

const req = (
  params: Record<string, string>,
  query: Record<string, string> = {},
): { params: Record<string, string>; query: Record<string, string> } => ({
  params,
  query,
});

test('parseNameAndNamespace returns decoded name and namespace', () => {
  expect(parseNameAndNamespace(req({ name: 'my%20pod', namespace: 'kube%20system' }))).toEqual({
    name: 'my pod',
    namespace: 'kube system',
  });
});

test('parseNameAndNamespace returns undefined when name is missing', () => {
  expect(parseNameAndNamespace(req({ namespace: 'default' }))).toBeUndefined();
});

test('parseNameAndNamespace returns undefined when namespace is missing', () => {
  expect(parseNameAndNamespace(req({ name: 'my-pod' }))).toBeUndefined();
});

test('parseNameAndNamespace returns undefined when params is empty', () => {
  expect(parseNameAndNamespace(req({}))).toBeUndefined();
});

test('parseNameAndEngineId returns decoded name and engineId', () => {
  expect(parseNameAndEngineId(req({ name: 'my%20network', engineId: 'podman%20engine' }))).toEqual({
    name: 'my network',
    engineId: 'podman engine',
  });
});

test('parseNameAndEngineId returns undefined when name is missing', () => {
  expect(parseNameAndEngineId(req({ engineId: 'podman' }))).toBeUndefined();
});

test('parseNameAndEngineId returns undefined when engineId is missing', () => {
  expect(parseNameAndEngineId(req({ name: 'my-vol' }))).toBeUndefined();
});

test('parseName returns decoded name', () => {
  expect(parseName(req({ name: 'node%201' }))).toEqual({ name: 'node 1' });
});

test('parseName returns undefined when name is missing', () => {
  expect(parseName(req({}))).toBeUndefined();
});

test('parseIdEngineIdAndBase64RepoTag returns parsed values with decoded engineId', () => {
  expect(
    parseIdEngineIdAndBase64RepoTag(req({ id: 'abc123', engineId: 'podman%20engine', base64RepoTag: 'dGVzdA==' })),
  ).toEqual({
    id: 'abc123',
    engineId: 'podman engine',
    base64RepoTag: 'dGVzdA==',
  });
});

test('parseIdEngineIdAndBase64RepoTag returns undefined when id is missing', () => {
  expect(parseIdEngineIdAndBase64RepoTag(req({ engineId: 'podman', base64RepoTag: 'dGVzdA==' }))).toBeUndefined();
});

test('parseIdEngineIdAndBase64RepoTag returns undefined when engineId is missing', () => {
  expect(parseIdEngineIdAndBase64RepoTag(req({ id: 'abc123', base64RepoTag: 'dGVzdA==' }))).toBeUndefined();
});

test('parseIdEngineIdAndBase64RepoTag returns undefined when base64RepoTag is missing', () => {
  expect(parseIdEngineIdAndBase64RepoTag(req({ id: 'abc123', engineId: 'podman' }))).toBeUndefined();
});
