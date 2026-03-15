import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { aiSessions } from './session.schema.js';

export type SessionRecord = InferSelectModel<typeof aiSessions>;
export type NewSessionRecord = InferInsertModel<typeof aiSessions>;
