import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type { VadFrame } from '@/business/domain/vad/vad.interface.js';
import type { SpeakerGender } from '@/business/domain/voice/voice.interface.js';

export interface ProcessAudioInput {
  readonly conversationId: string;
  readonly audio: Int16Array;
  readonly speakerGender?: SpeakerGender;
}

export type PipelineState =
  | 'listening'
  | 'transcribing'
  | 'answering'
  | 'synthesizing'
  | 'speaking';

export type PipelineEvent =
  | { readonly type: 'transcript'; readonly text: string }
  | { readonly type: 'agentResponse'; readonly text: string }
  | { readonly type: 'audio'; readonly audio: string; readonly contentType: string }
  | { readonly type: 'stateChange'; readonly state: PipelineState }
  | { readonly type: 'error'; readonly message: string };

export interface ProcessAudioResult {
  readonly vad: VadFrame;
  readonly events: PipelineEvent[];
}

export interface IRealtimeVoiceBusiness {
  processAudio(input: ProcessAudioInput): Promise<ProcessAudioResult>;
}

export const REALTIME_VOICE_BUSINESS =
  createToken<IRealtimeVoiceBusiness>('REALTIME_VOICE_BUSINESS');
