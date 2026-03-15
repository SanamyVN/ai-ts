import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { PROMPT_APP_SERVICE, PromptAppService } from './prompt.service.js';

export function promptAppProviders(): ProviderBundle {
  return {
    providers: [bind(PROMPT_APP_SERVICE, PromptAppService)],
    exports: [PROMPT_APP_SERVICE],
  };
}
