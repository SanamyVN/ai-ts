import { bind } from '@sanamyvn/foundation/di/node/providers';
import { PROMPT_REPOSITORY } from './prompt.interface.js';
import { PromptDrizzleRepository } from './prompt.db.js';

export function promptRepoProviders() {
  return {
    providers: [bind(PROMPT_REPOSITORY, PromptDrizzleRepository)],
    exports: [PROMPT_REPOSITORY],
  };
}
