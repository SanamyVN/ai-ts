// src/business/domain/prompt/prompt.providers.ts
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { PROMPT_SERVICE } from './prompt.interface.js';
import { PromptService } from './prompt.business.js';

export function promptBusinessProviders() {
  return {
    providers: [bind(PROMPT_SERVICE, PromptService)],
    exports: [PROMPT_SERVICE],
  };
}
