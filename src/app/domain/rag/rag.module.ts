import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { RAG_MIDDLEWARE_CONFIG } from './rag.tokens.js';
import type { RagMiddlewareConfig } from './rag.tokens.js';
import type { ModuleDefinition } from '@sanamyvn/foundation/di/node/module';

export interface RagAppModuleOptions {
  middleware?: RagMiddlewareConfig;
}

export class RagAppModule extends Module {
  exports = [];

  static forMonolith(options: RagAppModuleOptions = {}): ModuleDefinition {
    return {
      module: RagAppModule,
      providers: [value(RAG_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }

  static forStandalone(options: RagAppModuleOptions & { ragServiceUrl: string }): ModuleDefinition {
    return {
      module: RagAppModule,
      providers: [value(RAG_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }
}
