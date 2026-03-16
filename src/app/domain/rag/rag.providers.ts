import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { RAG_APP_SERVICE, RagAppService } from './rag.service.js';

export function ragAppProviders(): ProviderBundle {
  return {
    providers: [bind(RAG_APP_SERVICE, RagAppService)],
    exports: [RAG_APP_SERVICE],
  };
}
