import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestApp } from '@sanamyvn/foundation/http/testing';
import { createRouterToken } from '@sanamyvn/foundation/http/module';
import { value } from '@sanamyvn/foundation/di/core/providers';
import { bind } from '@sanamyvn/foundation/di/node/providers';
import { Module } from '@sanamyvn/foundation/di/node/module';
import { SessionRouter } from './session.router.js';
import { SESSION_APP_SERVICE } from './session.service.js';
import { SESSION_MIDDLEWARE_CONFIG } from './session.tokens.js';
import type { TestAppResult } from '@sanamyvn/foundation/http/testing';

// ---------------------------------------------------------------------------
// Mock service factory
// ---------------------------------------------------------------------------

function createMockSessionAppService() {
  return {
    list: vi.fn(),
    get: vi.fn(),
    end: vi.fn(),
    updateTitle: vi.fn(),
    delete: vi.fn(),
    appendMessageEvent: vi.fn(),
    countMessages: vi.fn(),
  };
}

type MockSessionAppService = ReturnType<typeof createMockSessionAppService>;

// ---------------------------------------------------------------------------
// Test module setup
// ---------------------------------------------------------------------------

const SESSION_ROUTER_TOKEN = createRouterToken('SESSION_ROUTER');

function createSessionTestModule(service: MockSessionAppService) {
  class SessionTestModule extends Module {
    exports = [SESSION_ROUTER_TOKEN];
    providers = [
      bind(SESSION_ROUTER_TOKEN, SessionRouter),
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- type erasure: providing a test double at the DI boundary
      value(SESSION_APP_SERVICE, service as never),
      value(SESSION_MIDDLEWARE_CONFIG, {}),
    ];
  }
  return SessionTestModule;
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

describe('SessionRouter', () => {
  let app: TestAppResult;
  let service: MockSessionAppService;

  beforeAll(async () => {
    service = createMockSessionAppService();
    app = await TestApp.create({
      modules: [createSessionTestModule(service)],
    });
  });

  afterAll(async () => {
    await app.destroy();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // POST /ai/sessions/:id/message-events
  // -------------------------------------------------------------------------

  describe('POST /ai/sessions/:id/message-events', () => {
    it('returns 204 and calls appendMessageEvent with parsed Date on valid sentAt', async () => {
      service.appendMessageEvent.mockResolvedValue(undefined);

      const eventId = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';
      const sentAtIso = '2026-04-01T10:00:00.000Z';
      const res = await app.post('/ai/sessions/session-1/message-events', {
        eventId,
        sentAt: sentAtIso,
      });

      expect(res.status).toBe(204);
      expect(service.appendMessageEvent).toHaveBeenCalledOnce();
      expect(service.appendMessageEvent).toHaveBeenCalledWith(
        'session-1',
        eventId,
        new Date(sentAtIso),
      );
    });

    it('returns 204 with timezone-offset sentAt', async () => {
      service.appendMessageEvent.mockResolvedValue(undefined);

      const eventId = 'b2c3d4e5-f6a7-4890-bcde-f01234567890';
      const sentAtWithOffset = '2026-04-01T12:00:00.000+02:00';
      const res = await app.post('/ai/sessions/session-2/message-events', {
        eventId,
        sentAt: sentAtWithOffset,
      });

      expect(res.status).toBe(204);
      expect(service.appendMessageEvent).toHaveBeenCalledWith(
        'session-2',
        eventId,
        new Date(sentAtWithOffset),
      );
    });

    it('returns 422 when eventId is missing', async () => {
      const res = await app.post('/ai/sessions/session-1/message-events', {
        sentAt: '2026-04-01T10:00:00.000Z',
      });

      expect(res.status).toBe(422);
      expect(service.appendMessageEvent).not.toHaveBeenCalled();
    });

    it('returns 422 when eventId is not a valid UUID', async () => {
      const res = await app.post('/ai/sessions/session-1/message-events', {
        eventId: 'not-a-uuid',
        sentAt: '2026-04-01T10:00:00.000Z',
      });

      expect(res.status).toBe(422);
      expect(service.appendMessageEvent).not.toHaveBeenCalled();
    });

    it('returns 422 when sentAt is missing', async () => {
      const res = await app.post('/ai/sessions/session-1/message-events', {});

      expect(res.status).toBe(422);
      expect(service.appendMessageEvent).not.toHaveBeenCalled();
    });

    it('returns 422 when sentAt is an epoch number string', async () => {
      const res = await app.post('/ai/sessions/session-1/message-events', {
        eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        sentAt: '1730419200',
      });

      expect(res.status).toBe(422);
      expect(service.appendMessageEvent).not.toHaveBeenCalled();
    });

    it('returns 422 when sentAt is a locale date string', async () => {
      const res = await app.post('/ai/sessions/session-1/message-events', {
        eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        sentAt: '4/1/2026',
      });

      expect(res.status).toBe(422);
      expect(service.appendMessageEvent).not.toHaveBeenCalled();
    });

    it('returns 422 when sentAt is not a valid date string', async () => {
      const res = await app.post('/ai/sessions/session-1/message-events', {
        eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        sentAt: 'not-a-date',
      });

      expect(res.status).toBe(422);
      expect(service.appendMessageEvent).not.toHaveBeenCalled();
    });

    it('returns 422 when sentAt is a raw ISO date without time (no offset)', async () => {
      const res = await app.post('/ai/sessions/session-1/message-events', {
        eventId: 'a1b2c3d4-e5f6-4789-abcd-ef0123456789',
        sentAt: '2026-04-01',
      });

      expect(res.status).toBe(422);
      expect(service.appendMessageEvent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // GET /ai/sessions/message-events/count
  // -------------------------------------------------------------------------

  describe('GET /ai/sessions/message-events/count', () => {
    it('returns 200 with { count } without tenantId', async () => {
      service.countMessages.mockResolvedValue({ count: 42 });

      const res = await app.get('/ai/sessions/message-events/count');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ count: 42 });
      expect(service.countMessages).toHaveBeenCalledOnce();
      expect(service.countMessages).toHaveBeenCalledWith({});
    });

    it('returns 200 with all optional filters parsed correctly', async () => {
      service.countMessages.mockResolvedValue({ count: 7 });

      const params = new URLSearchParams({
        purposePrefix: 'ta-',
        sentAtGte: '2026-04-01T00:00:00.000Z',
        sentAtLt: '2026-05-01T00:00:00.000Z',
      });
      const res = await app.get(`/ai/sessions/message-events/count?${params.toString()}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ count: 7 });
      expect(service.countMessages).toHaveBeenCalledWith({
        purposePrefix: 'ta-',
        sentAtGte: new Date('2026-04-01T00:00:00.000Z'),
        sentAtLt: new Date('2026-05-01T00:00:00.000Z'),
      });
    });

    it('silently strips a tenantId sent by a legacy caller', async () => {
      service.countMessages.mockResolvedValue({ count: 0 });

      const res = await app.get('/ai/sessions/message-events/count?tenantId=legacy-tenant');

      // Zod non-strict strips unknown fields — 200, not 422
      expect(res.status).toBe(200);
      // tenantId must not reach the service
      expect(service.countMessages).toHaveBeenCalledWith(
        expect.not.objectContaining({ tenantId: expect.anything() }),
      );
    });

    it('returns 422 when both purpose and purposePrefix are set', async () => {
      const params = new URLSearchParams({
        purpose: 'support',
        purposePrefix: 'sup-',
      });
      const res = await app.get(`/ai/sessions/message-events/count?${params.toString()}`);

      expect(res.status).toBe(422);
      expect(service.countMessages).not.toHaveBeenCalled();
    });

    it('returns 422 when sentAtLt is not strictly greater than sentAtGte', async () => {
      const params = new URLSearchParams({
        sentAtGte: '2026-05-01T00:00:00.000Z',
        sentAtLt: '2026-04-01T00:00:00.000Z',
      });
      const res = await app.get(`/ai/sessions/message-events/count?${params.toString()}`);

      expect(res.status).toBe(422);
      expect(service.countMessages).not.toHaveBeenCalled();
    });

    it('returns 422 when sentAtLt equals sentAtGte', async () => {
      const params = new URLSearchParams({
        sentAtGte: '2026-05-01T00:00:00.000Z',
        sentAtLt: '2026-05-01T00:00:00.000Z',
      });
      const res = await app.get(`/ai/sessions/message-events/count?${params.toString()}`);

      expect(res.status).toBe(422);
      expect(service.countMessages).not.toHaveBeenCalled();
    });

    it('is NOT swallowed by GET /:id — countMessages is called, not get', async () => {
      service.countMessages.mockResolvedValue({ count: 0 });

      await app.get('/ai/sessions/message-events/count');

      expect(service.countMessages).toHaveBeenCalled();
      expect(service.get).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // GET /ai/sessions (list)
  // -------------------------------------------------------------------------

  describe('GET /ai/sessions', () => {
    it('returns 200 with paginated { items, page, perPage } shape', async () => {
      const mockItem = {
        id: 'session-1',
        userId: 'user-1',
        promptSlug: 'prompt',
        purpose: 'support',
        status: 'active',
        title: null,
        startedAt: '2026-01-01T00:00:00.000Z',
        messageCount: 3,
      };
      service.list.mockResolvedValue({
        items: [mockItem],
        page: 1,
        perPage: 20,
      });

      const res = await app.get('/ai/sessions?page=1&perPage=20');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        items: [mockItem],
        page: 1,
        perPage: 20,
      });
      expect(body).toHaveProperty(['items', 0, 'messageCount'], 3);
    });

    it('silently strips tenantId sent by legacy callers', async () => {
      service.list.mockResolvedValue({ items: [], page: 1, perPage: 20 });

      const res = await app.get('/ai/sessions?page=1&perPage=20&tenantId=tenant-old');

      expect(res.status).toBe(200);
      expect(service.list).toHaveBeenCalledWith(
        expect.not.objectContaining({ tenantId: expect.anything() }),
      );
    });

    it('returns 422 when page is missing', async () => {
      const res = await app.get('/ai/sessions?perPage=20');

      expect(res.status).toBe(422);
    });

    it('returns 422 when perPage is missing', async () => {
      const res = await app.get('/ai/sessions?page=1');

      expect(res.status).toBe(422);
    });

    it('returns 422 when both purpose and purposePrefix are set', async () => {
      const params = new URLSearchParams({
        page: '1',
        perPage: '20',
        purpose: 'support',
        purposePrefix: 'sup-',
      });
      const res = await app.get(`/ai/sessions?${params.toString()}`);

      expect(res.status).toBe(422);
      expect(service.list).not.toHaveBeenCalled();
    });

    it('returns 422 when startedAtLt is not strictly greater than startedAtGte', async () => {
      const params = new URLSearchParams({
        page: '1',
        perPage: '20',
        startedAtGte: '2026-05-01T00:00:00.000Z',
        startedAtLt: '2026-04-01T00:00:00.000Z',
      });
      const res = await app.get(`/ai/sessions?${params.toString()}`);

      expect(res.status).toBe(422);
      expect(service.list).not.toHaveBeenCalled();
    });

    it('returns 422 when startedAtLt equals startedAtGte', async () => {
      const params = new URLSearchParams({
        page: '1',
        perPage: '20',
        startedAtGte: '2026-05-01T00:00:00.000Z',
        startedAtLt: '2026-05-01T00:00:00.000Z',
      });
      const res = await app.get(`/ai/sessions?${params.toString()}`);

      expect(res.status).toBe(422);
      expect(service.list).not.toHaveBeenCalled();
    });
  });
});
