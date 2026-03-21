import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { VAD_MIDDLEWARE_CONFIG } from './vad.tokens.js';
import type { VadMiddlewareConfig } from './vad.tokens.js';
import type { ModuleDefinition } from '@sanamyvn/foundation/di/node/module';

export interface VadAppModuleOptions {
  middleware?: VadMiddlewareConfig;
}

export class VadAppModule extends Module {
  exports = [];

  static forMonolith(options: VadAppModuleOptions = {}): ModuleDefinition {
    return {
      module: VadAppModule,
      providers: [value(VAD_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }

  static forStandalone(options: VadAppModuleOptions & { vadServiceUrl: string }): ModuleDefinition {
    // vadServiceUrl is passed to vadClientStandaloneProviders() by the caller — not wired here.
    return {
      module: VadAppModule,
      providers: [value(VAD_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }
}
