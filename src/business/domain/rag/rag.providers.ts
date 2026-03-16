import { bind } from '@sanamyvn/foundation/di/node/providers';
import { RAG_BUSINESS } from './rag.interface.js';
import { RagBusiness } from './rag.business.js';

/**
 * Returns the DI provider bindings for the RAG business domain.
 * Include this in your module's provider list to make `RAG_BUSINESS`
 * injectable throughout the business layer.
 */
export function ragBusinessProviders() {
  return {
    providers: [bind(RAG_BUSINESS, RagBusiness)],
    exports: [RAG_BUSINESS],
  };
}
