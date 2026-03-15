import { bind } from '@sanamyvn/foundation/di/node/providers';
import { SESSION_REPOSITORY } from './session.interface.js';
import { SessionDrizzleRepository } from './session.db.js';

export function sessionRepoProviders() {
  return {
    providers: [bind(SESSION_REPOSITORY, SessionDrizzleRepository)],
    exports: [SESSION_REPOSITORY],
  };
}
