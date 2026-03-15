import { z } from 'zod';

export const createConversationDto = z.object({
  promptSlug: z.string().min(1),
  promptParams: z.record(z.string(), z.unknown()),
  userId: z.string().min(1),
  tenantId: z.string().optional(),
  purpose: z.string().min(1),
  model: z.string().optional(),
});
export type CreateConversationDto = z.infer<typeof createConversationDto>;

export const sendMessageDto = z.object({
  message: z.string().min(1),
});
export type SendMessageDto = z.infer<typeof sendMessageDto>;

export const conversationResponseDto = z.object({
  id: z.string(),
  sessionId: z.string(),
  promptSlug: z.string(),
  model: z.string(),
  resolvedPrompt: z.string(),
});
export type ConversationResponseDto = z.infer<typeof conversationResponseDto>;

export const messageResponseDto = z.object({
  text: z.string(),
  object: z.unknown().optional(),
});
export type MessageResponseDto = z.infer<typeof messageResponseDto>;
