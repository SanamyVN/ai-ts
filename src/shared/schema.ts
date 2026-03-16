import { aiPrompts } from '@/repository/domain/prompt/prompt.schema.js';
import { aiPromptVersions } from '@/repository/domain/prompt-version/prompt-version.schema.js';
import { aiSessions } from '@/repository/domain/session/session.schema.js';

export const aiSchema = { aiPrompts, aiPromptVersions, aiSessions };
export type AiSchema = typeof aiSchema;
