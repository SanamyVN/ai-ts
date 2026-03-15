import { z } from 'zod';
import { createCommand } from '@sanamyvn/foundation/mediator/request';
import { conversationClientSchema, conversationResponseClientSchema } from './schemas.js';

export const CreateConversationCommand = createCommand({
  type: 'ai.conversation.create',
  payload: z.object({
    promptSlug: z.string(),
    promptParams: z.record(z.string(), z.unknown()),
    userId: z.string(),
    tenantId: z.string().optional(),
    purpose: z.string(),
    model: z.string().optional(),
  }),
  response: conversationClientSchema,
});

export const SendMessageCommand = createCommand({
  type: 'ai.conversation.sendMessage',
  payload: z.object({
    conversationId: z.string(),
    message: z.string(),
  }),
  response: conversationResponseClientSchema,
});
