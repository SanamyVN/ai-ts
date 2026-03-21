import { z } from 'zod';

export const processAudioRequestDto = z.object({
  conversationId: z.string(),
  audio: z.string().min(1),
});
export type ProcessAudioRequestDto = z.infer<typeof processAudioRequestDto>;

const pipelineEventDto = z.discriminatedUnion('type', [
  z.object({ type: z.literal('transcript'), text: z.string() }),
  z.object({ type: z.literal('agentResponse'), text: z.string() }),
  z.object({ type: z.literal('audio'), audio: z.string(), contentType: z.string() }),
  z.object({
    type: z.literal('stateChange'),
    state: z.enum(['listening', 'transcribing', 'answering', 'synthesizing', 'speaking']),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

export const processAudioResponseDto = z.object({
  vad: z.object({ isSpeech: z.boolean(), probability: z.number() }),
  events: z.array(pipelineEventDto),
});
export type ProcessAudioResponseDto = z.infer<typeof processAudioResponseDto>;
