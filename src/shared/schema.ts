import { aiPrompts } from '@/repository/domain/prompt/prompt.schema.js';
import { aiPromptVersions } from '@/repository/domain/prompt-version/prompt-version.schema.js';
import { aiSessions } from '@/repository/domain/session/session.schema.js';
import { aiSessionMessages } from '@/repository/domain/session-message/session-message.schema.js';

export const aiSchema = { aiPrompts, aiPromptVersions, aiSessions, aiSessionMessages };
export type AiSchema = typeof aiSchema;
