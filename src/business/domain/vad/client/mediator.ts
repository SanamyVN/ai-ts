import type { IToken } from '@sanamyvn/foundation/di/core/tokens';
import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { DetectSpeechClientResult } from './schemas.js';
import { VadDetectSpeechCommand } from './queries.js';

export interface IVadMediator {
  detectSpeech(
    command: InstanceType<typeof VadDetectSpeechCommand>,
  ): Promise<DetectSpeechClientResult>;
}

export const VAD_MEDIATOR: IToken<IVadMediator> = createMediatorToken<IVadMediator>('VAD_MEDIATOR', {
  detectSpeech: VadDetectSpeechCommand,
});
