import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { aiPrompts } from './prompt.schema.js';

export type PromptRecord = InferSelectModel<typeof aiPrompts>;
export type NewPromptRecord = InferInsertModel<typeof aiPrompts>;
