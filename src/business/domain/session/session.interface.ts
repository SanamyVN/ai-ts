import { createToken } from '@sanamyvn/foundation/di/core/tokens';
import type {
  Session,
  SessionSummary,
  StartSessionInput,
  SessionFilter,
  Transcript,
} from './session.model.js';
import type { MessageList, Pagination } from '@/business/sdk/mastra/mastra.interface.js';

export interface ISessionService {
  start(input: StartSessionInput): Promise<Session>;
  pause(sessionId: string): Promise<void>;
  resume(sessionId: string): Promise<Session>;
  end(sessionId: string): Promise<void>;
  get(sessionId: string): Promise<Session>;
  list(filter: SessionFilter): Promise<SessionSummary[]>;
  getMessages(sessionId: string, pagination: Pagination): Promise<MessageList>;
  exportTranscript(sessionId: string, format: 'json' | 'text'): Promise<Transcript>;
}

export const SESSION_SERVICE = createToken<ISessionService>('SESSION_SERVICE');
