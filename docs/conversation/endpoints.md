# Conversation -- Endpoints

Base path: `/ai/conversations`

| Method | Path | Operation | Request | Response |
|--------|------|-----------|---------|----------|
| `POST` | `/ai/conversations` | `create` | `createConversationDto` (body) | `conversationResponseDto` |
| `POST` | `/ai/conversations/:id/messages` | `sendMessage` | `sendMessageDto` (body) | `messageResponseDto` |
| `POST` | `/ai/conversations/:id/messages/stream` | `streamMessage` | `sendMessageDto` (body) | SSE stream of `StreamChunk` |

**Operation names** match the keys in `ConversationMiddlewareConfig`, so you can cross-reference which middleware applies to which route.

**DTO types** are internal to the router. For exact shapes, see the Zod schemas in `src/app/domain/conversation/conversation.dto.ts`.

**Note:** The `streamMessage` endpoint currently uses the same handler as `sendMessage`. SSE streaming is the intended behavior but not yet implemented at the app layer. The business-layer `IConversationEngine.stream()` method works correctly.
