import { bind } from '@sanamyvn/foundation/di/node/providers';
import type { ProviderBundle } from '@/shared/provider-bundle.js';
import { SESSION_APP_SERVICE, SessionAppService } from './session.service.js';

export function sessionAppProviders(): ProviderBundle {
  return {
    providers: [bind(SESSION_APP_SERVICE, SessionAppService)],
    exports: [SESSION_APP_SERVICE],
  };
}
