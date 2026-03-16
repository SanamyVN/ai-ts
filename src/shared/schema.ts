import { aiPrompts } from '@/repository/domain/prompt/prompt.schema.js';
import { aiPromptVersions } from '@/repository/domain/prompt-version/prompt-version.schema.js';
import { aiSessions } from '@/repository/domain/session/session.schema.js';

export const aiSchema = { aiPrompts, aiPromptVersions, aiSessions };

/** Minimum schema constraint — downstream schemas must include at least these tables. */
export type AiRequiredSchema = typeof aiSchema;
