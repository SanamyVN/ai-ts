import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { CONVERSATION_MIDDLEWARE_CONFIG } from './conversation.tokens.js';
import type { ConversationMiddlewareConfig } from './conversation.tokens.js';
import type { ModuleDefinition } from '@sanamyvn/foundation/di/node/module';

export interface ConversationAppModuleOptions {
  middleware?: ConversationMiddlewareConfig;
}

export class ConversationAppModule extends Module {
  exports = [];

  static forMonolith(options: ConversationAppModuleOptions = {}): ModuleDefinition {
    return {
      module: ConversationAppModule,
      providers: [value(CONVERSATION_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }

  static forStandalone(
    options: ConversationAppModuleOptions & {
      promptServiceUrl: string;
      sessionServiceUrl: string;
    },
  ): ModuleDefinition {
    return {
      module: ConversationAppModule,
      providers: [value(CONVERSATION_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }
}
