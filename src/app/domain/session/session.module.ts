import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { SESSION_MIDDLEWARE_CONFIG } from './session.tokens.js';
import type { SessionMiddlewareConfig } from './session.tokens.js';
import type { ModuleDefinition } from '@sanamyvn/foundation/di/node/module';

export interface SessionAppModuleOptions {
  middleware?: SessionMiddlewareConfig;
}

export class SessionAppModule extends Module {
  exports = [];

  static forRoot(options: SessionAppModuleOptions = {}): ModuleDefinition {
    return {
      module: SessionAppModule,
      providers: [value(SESSION_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }
}
