import { createMediatorToken } from '@sanamyvn/foundation/mediator/mediator-token';
import type { DetectSpeechClientResult } from './schemas.js';
import { VadDetectSpeechCommand } from './queries.js';

export interface IVadMediator {
  detectSpeech(
    command: InstanceType<typeof VadDetectSpeechCommand>,
  ): Promise<DetectSpeechClientResult>;
}

export const VAD_MEDIATOR = createMediatorToken<IVadMediator>('VAD_MEDIATOR', {
  detectSpeech: VadDetectSpeechCommand,
});
