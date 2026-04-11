import { Injectable, Inject } from '@sanamyvn/foundation/di/node/decorators';
import type { IMediator } from '@sanamyvn/foundation/mediator';
import { AI_MEDIATOR } from '@/shared/tokens.js';
import { VadDetectSpeechCommand } from '@/business/domain/vad/client/queries.js';
import {
  VoiceSpeechToTextCommand,
  VoiceTextToSpeechCommand,
} from '@/business/domain/voice/client/queries.js';
import { SendMessageCommand } from '@/business/domain/conversation/client/queries.js';
import { AI_CONFIG, type AiConfig } from '@/config.js';
import { AI_METRICS } from '@/foundation/ai-metrics/ai-metrics.interface.js';
import type { IAiMetrics } from '@/foundation/ai-metrics/ai-metrics.interface.js';
import type {
  IRealtimeVoiceBusiness,
  ProcessAudioInput,
  ProcessAudioResult,
  PipelineEvent,
} from './realtime-voice.interface.js';
import { PRE_BUFFER_DEPTH } from './realtime-voice.model.js';
import type { ConversationPipelineState } from './realtime-voice.model.js';

const STT_MODEL = 'whisper-1';
const PCM_SAMPLE_RATE = 16000;

@Injectable()
export class RealtimeVoiceBusiness implements IRealtimeVoiceBusiness {
  private readonly conversations = new Map<string, ConversationPipelineState>();

  constructor(
    @Inject(AI_MEDIATOR) private readonly mediator: IMediator,
    @Inject(AI_CONFIG) private readonly config: AiConfig,
    @Inject(AI_METRICS) private readonly aiMetrics: IAiMetrics,
  ) {}

  async processAudio(input: ProcessAudioInput): Promise<ProcessAudioResult> {
    const { conversationId, audio } = input;

    let state = this.conversations.get(conversationId);
    if (!state) {
      state = {
        conversationId,
        state: 'listening',
        preBuffer: [],
        audioBuffer: [],
        speaking: false,
        eventQueue: [],
        lastFrameAt: Date.now(),
        ...(input.speakerGender !== undefined && { speakerGender: input.speakerGender }),
        ...(input.metricsContext !== undefined && { metricsContext: input.metricsContext }),
      };
      this.conversations.set(conversationId, state);
    }

    const audioBase64 = Buffer.from(audio.buffer, audio.byteOffset, audio.byteLength).toString(
      'base64',
    );

    const vad = await this.mediator.send(new VadDetectSpeechCommand({ audio: audioBase64 }));

    const events: PipelineEvent[] = [...state.eventQueue];
    state.eventQueue = [];

    if (state.state === 'listening') {
      if (vad.isSpeech && !state.speaking) {
        // Speech onset: flush pre-buffer into audio buffer
        state.audioBuffer = [...state.preBuffer, audio];
        state.preBuffer = [];
        state.speaking = true;
      } else if (vad.isSpeech && state.speaking) {
        // Continuing speech
        state.audioBuffer.push(audio);
      } else if (!vad.isSpeech && state.speaking) {
        // Speech end: trigger pipeline
        state.speaking = false;
        void this.runChain(conversationId);
      } else {
        // Silence, not speaking: fill rolling pre-buffer
        state.preBuffer.push(audio);
        if (state.preBuffer.length > PRE_BUFFER_DEPTH) {
          state.preBuffer.shift();
        }
      }
    } else {
      // Pipeline is processing — keep filling pre-buffer for next onset
      state.preBuffer.push(audio);
      if (state.preBuffer.length > PRE_BUFFER_DEPTH) {
        state.preBuffer.shift();
      }
    }

    state.lastFrameAt = Date.now();

    return { vad: { isSpeech: vad.isSpeech, probability: vad.probability }, events };
  }

  private async runChain(conversationId: string): Promise<void> {
    const state = this.conversations.get(conversationId);
    if (!state) return;

    try {
      // 1. Transcribe
      state.state = 'transcribing';
      state.eventQueue.push({ type: 'stateChange', state: 'transcribing' });

      const totalSamples = state.audioBuffer.reduce((sum, arr) => sum + arr.length, 0);
      const durationSeconds = totalSamples / PCM_SAMPLE_RATE;

      const concatenated = this.concatInt16Arrays(state.audioBuffer);
      const sttBase64 = Buffer.from(
        concatenated.buffer,
        concatenated.byteOffset,
        concatenated.byteLength,
      ).toString('base64');

      const sttStart = performance.now();
      const sttResult = await this.mediator.send(
        new VoiceSpeechToTextCommand({
          audio: sttBase64,
          contentType: 'audio/pcm;rate=16000',
        }),
      );

      this.aiMetrics.recordSttUsage({
        model: STT_MODEL,
        userId: 'unknown',
        durationSeconds,
        ...(state.metricsContext !== undefined && { metricsContext: state.metricsContext }),
      });
      this.aiMetrics.recordOperation({
        model: STT_MODEL,
        userId: 'unknown',
        status: 'success',
        latencyMs: performance.now() - sttStart,
        ...(state.metricsContext !== undefined && { metricsContext: state.metricsContext }),
      });

      // 2. Get LLM response
      state.state = 'answering';
      state.eventQueue.push(
        { type: 'transcript', text: sttResult.text },
        { type: 'stateChange', state: 'answering' },
      );

      const llmResult = await this.mediator.send(
        new SendMessageCommand({ conversationId, message: sttResult.text }),
      );

      // 3. Synthesize speech
      state.state = 'synthesizing';
      state.eventQueue.push({ type: 'stateChange', state: 'synthesizing' });
      const speakerGender = state.speakerGender ?? 'male';

      const ttsResult = await this.mediator.send(
        new VoiceTextToSpeechCommand({
          text: llmResult.text,
          speakerGender,
        }),
      );

      // 4. Done — queue final events and reset
      state.state = 'speaking';
      state.eventQueue.push(
        { type: 'agentResponse', text: llmResult.text },
        { type: 'audio', audio: ttsResult.audio, contentType: ttsResult.contentType },
        { type: 'stateChange', state: 'listening' },
      );

      state.state = 'listening';
      state.audioBuffer = [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown pipeline error';
      state.eventQueue.push({ type: 'error', message });
      state.state = 'listening';
      state.audioBuffer = [];
      this.aiMetrics.recordOperation({
        model: STT_MODEL,
        userId: 'unknown',
        status: 'error',
        latencyMs: 0,
        ...(state.metricsContext !== undefined && { metricsContext: state.metricsContext }),
      });
    }
  }

  private concatInt16Arrays(arrays: Int16Array[]): Int16Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Int16Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
}
