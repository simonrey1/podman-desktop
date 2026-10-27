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

import { type IConfigurationNode, IConfigurationRegistry } from '@desktop-framework/api/configuration';
import { inject, injectable, postConstruct } from 'inversify';

export const RENDERER_V2_SECTION = 'rendererV2';
export const RENDERER_V2_PROPERTY = 'enabled';

/**
 * Experimental flag loading packages/renderer-v2 in the main window instead of packages/renderer.
 * The main window reads it when it loads its page, so changing it requires a restart.
 */
@injectable()
export class RendererV2Configuration {
  constructor(@inject(IConfigurationRegistry) private readonly configurationRegistry: IConfigurationRegistry) {}

  @postConstruct()
  init(): void {
    const rendererV2Configuration: IConfigurationNode = {
      id: 'preferences.experimental.rendererV2',
      title: 'Experimental (Renderer v2)',
      type: 'object',
      properties: {
        [`${RENDERER_V2_SECTION}.${RENDERER_V2_PROPERTY}`]: {
          description: 'Use the new renderer (packages/renderer-v2). Requires a restart.',
          type: 'object',
          default: false,
          experimental: {},
        },
      },
    };
    this.configurationRegistry.registerConfigurations([rendererV2Configuration]);
  }

  /** Experimental features are enabled when their value is an object. */
  isEnabled(): boolean {
    const value = this.configurationRegistry.getConfiguration(RENDERER_V2_SECTION).get<unknown>(RENDERER_V2_PROPERTY);
    return typeof value === 'object' && value !== null;
  }
}
