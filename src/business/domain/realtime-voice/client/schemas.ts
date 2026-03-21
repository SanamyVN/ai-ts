import { z } from 'zod';

export const processAudioClientSchema = z.object({
  conversationId: z.string(),
  audio: z.string(),
});

const pipelineEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('transcript'), text: z.string() }),
  z.object({ type: z.literal('agentResponse'), text: z.string() }),
  z.object({ type: z.literal('audio'), audio: z.string(), contentType: z.string() }),
  z.object({
    type: z.literal('stateChange'),
    state: z.enum(['listening', 'transcribing', 'answering', 'synthesizing', 'speaking']),
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

export const processAudioResultSchema = z.object({
  vad: z.object({ isSpeech: z.boolean(), probability: z.number() }),
  events: z.array(pipelineEventSchema),
});

export type ProcessAudioClientResult = z.infer<typeof processAudioResultSchema>;
