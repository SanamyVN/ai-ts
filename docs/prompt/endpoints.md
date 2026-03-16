# Prompt — Endpoints

Base path: `/ai/prompts`

| Method | Path | Operation | Request | Response |
|--------|------|-----------|---------|----------|
| `POST` | `/ai/prompts` | `create` | `createPromptDto` (body) | `promptResponseDto` |
| `GET` | `/ai/prompts` | `list` | `promptListQueryDto` (query) | `promptResponseDto[]` |
| `GET` | `/ai/prompts/:slug` | `getBySlug` | — | `promptResponseDto` |
| `PUT` | `/ai/prompts/:slug` | `update` | `updatePromptDto` (body) | `promptResponseDto` |
| `POST` | `/ai/prompts/:slug/versions` | `createVersion` | `createVersionDto` (body) | `promptResponseDto` |
| `PUT` | `/ai/prompts/:slug/versions/:id/activate` | `activateVersion` | — | 204 No Content |
| `GET` | `/ai/prompts/:slug/versions` | `listVersions` | — | `promptResponseDto` |

**Operation names** match the keys in `PromptMiddlewareConfig`, so you can cross-reference which middleware applies to which route.

**DTO types** are internal to the router. For exact shapes, see the Zod schemas in `src/app/domain/prompt/prompt.dto.ts`.

**Note:** `listVersions` returns the prompt with its active version embedded — not a separate version list.
