import type { Provider } from '@sanamyvn/foundation/di/node/providers';
import type { IToken } from '@sanamyvn/foundation/di/core/tokens';

export interface ProviderBundle {
  readonly providers: Provider[];
  readonly exports: IToken<unknown>[];
}
