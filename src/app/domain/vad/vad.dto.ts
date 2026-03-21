import { z } from 'zod';

export const detectSpeechRequestDto = z.object({
  audio: z.string().min(1),
});
export type DetectSpeechRequestDto = z.infer<typeof detectSpeechRequestDto>;

export const detectSpeechResponseDto = z.object({
  isSpeech: z.boolean(),
  probability: z.number(),
});
export type DetectSpeechResponseDto = z.infer<typeof detectSpeechResponseDto>;
