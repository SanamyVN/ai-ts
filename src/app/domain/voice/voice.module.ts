import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { VOICE_MIDDLEWARE_CONFIG } from './voice.tokens.js';
import type { VoiceMiddlewareConfig } from './voice.tokens.js';
import type { ModuleDefinition } from '@sanamyvn/foundation/di/node/module';

export interface VoiceAppModuleOptions {
  middleware?: VoiceMiddlewareConfig;
}

export class VoiceAppModule extends Module {
  exports = [];

  static forMonolith(options: VoiceAppModuleOptions = {}): ModuleDefinition {
    return {
      module: VoiceAppModule,
      providers: [value(VOICE_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }

  static forStandalone(
    options: VoiceAppModuleOptions & { voiceServiceUrl: string },
  ): ModuleDefinition {
    // voiceServiceUrl is passed to voiceClientStandaloneProviders() by the caller — not wired here.
    return {
      module: VoiceAppModule,
      providers: [value(VOICE_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }
}
