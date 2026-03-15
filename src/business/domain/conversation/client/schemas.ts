import { z } from 'zod';

export const conversationClientSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  promptSlug: z.string(),
  resolvedPrompt: z.string(),
  model: z.string(),
});
export type ConversationClient = z.infer<typeof conversationClientSchema>;

export const conversationResponseClientSchema = z.object({
  text: z.string(),
  object: z.unknown().optional(),
});
export type ConversationResponseClient = z.infer<typeof conversationResponseClientSchema>;
