import type { PipelineState, PipelineEvent } from './realtime-voice.interface.js';

export interface ConversationPipelineState {
  conversationId: string;
  state: PipelineState;
  audioBuffer: Int16Array[];
  eventQueue: PipelineEvent[];
  lastFrameAt: number;
}
