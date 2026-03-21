import { z } from 'zod';

export const detectSpeechClientSchema = z.object({
  audio: z.string(),
});

export const detectSpeechResultSchema = z.object({
  isSpeech: z.boolean(),
  probability: z.number(),
});

export type DetectSpeechClientResult = z.infer<typeof detectSpeechResultSchema>;
