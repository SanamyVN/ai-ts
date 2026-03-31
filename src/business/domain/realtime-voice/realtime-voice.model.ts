import type { PipelineState, PipelineEvent } from './realtime-voice.interface.js';
import type { SpeakerGender } from '@/business/domain/voice/voice.interface.js';

/** Number of frames to keep before speech onset to capture the beginning of an utterance. */
export const PRE_BUFFER_DEPTH = 5;

export interface ConversationPipelineState {
  conversationId: string;
  state: PipelineState;
  /** Rolling buffer of recent frames (capped to PRE_BUFFER_DEPTH). Only filled when speaking=false. */
  preBuffer: Int16Array[];
  /** Audio captured during speech — grows until silence triggers the pipeline. */
  audioBuffer: Int16Array[];
  /** Whether the user is currently mid-utterance. */
  speaking: boolean;
  eventQueue: PipelineEvent[];
  lastFrameAt: number;
  /** TTS voice gender for this conversation. Set on first processAudio call, immutable afterward. */
  speakerGender?: SpeakerGender;
}
