import { z } from 'zod';

export const textToSpeechClientSchema = z.object({
  text: z.string().min(1),
  speakerGender: z.enum(['male', 'female']),
  options: z.record(z.string(), z.unknown()).optional(),
});

export const textToSpeechResultSchema = z.object({
  audio: z.string(),
  contentType: z.string(),
});

export const speechToTextClientSchema = z.object({
  audio: z.string(),
  contentType: z.string(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export const speechToTextResultSchema = z.object({
  text: z.string(),
});

export const getSpeakersResultSchema = z.object({
  speakers: z.array(z.looseObject({ voiceId: z.string() })),
});

export type TextToSpeechClientResult = z.infer<typeof textToSpeechResultSchema>;
export type SpeechToTextClientResult = z.infer<typeof speechToTextResultSchema>;
export type GetSpeakersClientResult = z.infer<typeof getSpeakersResultSchema>;
