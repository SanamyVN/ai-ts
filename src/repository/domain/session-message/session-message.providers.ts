import { bind } from '@sanamyvn/foundation/di/node/providers';
import { SESSION_MESSAGE_REPOSITORY } from './session-message.interface.js';
import { SessionMessageDrizzleRepository } from './session-message.db.js';

/** DI providers binding {@link SESSION_MESSAGE_REPOSITORY} to the Drizzle implementation. */
export function sessionMessageRepoProviders() {
  return {
    providers: [bind(SESSION_MESSAGE_REPOSITORY, SessionMessageDrizzleRepository)],
    exports: [SESSION_MESSAGE_REPOSITORY],
  };
}
