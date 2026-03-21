import { Module } from '@sanamyvn/foundation/di/node/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { REALTIME_VOICE_MIDDLEWARE_CONFIG } from './realtime-voice.tokens.js';
import type { RealtimeVoiceMiddlewareConfig } from './realtime-voice.tokens.js';
import type { ModuleDefinition } from '@sanamyvn/foundation/di/node/module';

export interface RealtimeVoiceAppModuleOptions {
  middleware?: RealtimeVoiceMiddlewareConfig;
}

export class RealtimeVoiceAppModule extends Module {
  exports = [];

  static forMonolith(options: RealtimeVoiceAppModuleOptions = {}): ModuleDefinition {
    return {
      module: RealtimeVoiceAppModule,
      providers: [value(REALTIME_VOICE_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }

  static forStandalone(
    options: RealtimeVoiceAppModuleOptions & { realtimeVoiceServiceUrl: string },
  ): ModuleDefinition {
    // realtimeVoiceServiceUrl is passed to realtimeVoiceClientStandaloneProviders() by the caller — not wired here.
    return {
      module: RealtimeVoiceAppModule,
      providers: [value(REALTIME_VOICE_MIDDLEWARE_CONFIG, options.middleware ?? {})],
      exports: [],
    };
  }
}
