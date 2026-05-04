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

type RouteRequest = { query: Record<string, string>; params: Record<string, string> };

export function parseNameAndNamespace(request: RouteRequest): { name: string; namespace: string } | undefined {
  if (!request.params?.name || !request.params?.namespace) return undefined;
  return {
    name: decodeURI(request.params.name),
    namespace: decodeURI(request.params.namespace),
  };
}

export function parseNameAndEngineId(request: RouteRequest): { name: string; engineId: string } | undefined {
  if (!request.params?.name || !request.params?.engineId) return undefined;
  return {
    name: decodeURI(request.params.name),
    engineId: decodeURI(request.params.engineId),
  };
}

export function parseName(request: RouteRequest): { name: string } | undefined {
  if (!request.params?.name) return undefined;
  return {
    name: decodeURI(request.params.name),
  };
}

export function parseIdEngineIdAndBase64RepoTag(
  request: RouteRequest,
): { id: string; engineId: string; base64RepoTag: string } | undefined {
  if (!request.params?.id || !request.params?.engineId || !request.params?.base64RepoTag) return undefined;
  return {
    id: request.params.id,
    engineId: decodeURI(request.params.engineId),
    base64RepoTag: request.params.base64RepoTag,
  };
}
