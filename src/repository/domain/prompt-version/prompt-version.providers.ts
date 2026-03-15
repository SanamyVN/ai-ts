import { bind } from '@sanamyvn/foundation/di/node/providers';
import { PROMPT_VERSION_REPOSITORY } from './prompt-version.interface.js';
import { PromptVersionDrizzleRepository } from './prompt-version.db.js';

export function promptVersionRepoProviders() {
  return {
    providers: [bind(PROMPT_VERSION_REPOSITORY, PromptVersionDrizzleRepository)],
    exports: [PROMPT_VERSION_REPOSITORY],
  };
}
