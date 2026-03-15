import { bind } from '@sanamyvn/foundation/di/node/providers';
import { SESSION_SERVICE } from './session.interface.js';
import { SessionService } from './session.business.js';

export function sessionBusinessProviders() {
  return {
    providers: [bind(SESSION_SERVICE, SessionService)],
    exports: [SESSION_SERVICE],
  };
}
