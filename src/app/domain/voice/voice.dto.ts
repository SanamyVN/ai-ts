import { z } from 'zod';

export const textToSpeechRequestDto = z.object({
  text: z.string().min(1),
  speakerGender: z.enum(['male', 'female']),
  options: z.record(z.string(), z.unknown()).optional(),
});
export type TextToSpeechRequestDto = z.infer<typeof textToSpeechRequestDto>;

export const speechToTextResponseDto = z.object({
  text: z.string(),
});
export type SpeechToTextResponseDto = z.infer<typeof speechToTextResponseDto>;

export const getSpeakersResponseDto = z.object({
  speakers: z.array(z.looseObject({ voiceId: z.string() })),
});
export type GetSpeakersResponseDto = z.infer<typeof getSpeakersResponseDto>;
