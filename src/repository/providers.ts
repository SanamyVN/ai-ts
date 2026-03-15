import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { promptRepoProviders } from './domain/prompt/prompt.providers.js';
import { promptVersionRepoProviders } from './domain/prompt-version/prompt-version.providers.js';
import { sessionRepoProviders } from './domain/session/session.providers.js';

export function aiRepoProviders(): ProviderBundle {
  const prompt = promptRepoProviders();
  const promptVersion = promptVersionRepoProviders();
  const session = sessionRepoProviders();

  return {
    providers: [...prompt.providers, ...promptVersion.providers, ...session.providers],
    exports: [...prompt.exports, ...promptVersion.exports, ...session.exports],
  };
}
