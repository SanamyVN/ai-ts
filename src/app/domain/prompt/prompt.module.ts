import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { PROMPT_MIDDLEWARE_CONFIG } from './prompt.tokens.js';
import type { PromptMiddlewareConfig } from './prompt.tokens.js';
import type { ModuleDefinition } from '@sanamyvn/foundation/di/node/module';

export interface PromptAppModuleOptions {
  middleware?: PromptMiddlewareConfig;
}

export class PromptAppModule extends Module {
  exports = [];

  static forRoot(options: PromptAppModuleOptions = {}): ModuleDefinition {
    return {
      module: PromptAppModule,
      providers: [value(PROMPT_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }
}
