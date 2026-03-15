import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { aiPromptVersions } from './prompt-version.schema.js';

export type PromptVersionRecord = InferSelectModel<typeof aiPromptVersions>;
export type NewPromptVersionRecord = InferInsertModel<typeof aiPromptVersions>;
