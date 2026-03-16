# Session -- Endpoints

Base path: `/ai/sessions`

## Route Table

| Method | Path                          | Operation          | Request                       | Response                      |
| ------ | ----------------------------- | ------------------ | ----------------------------- | ----------------------------- |
| `GET`  | `/ai/sessions`                | `list`             | `sessionListQueryDto` (query) | `sessionSummaryResponseDto[]` |
| `GET`  | `/ai/sessions/:id`            | `get`              | --                            | `sessionResponseDto`          |
| `GET`  | `/ai/sessions/:id/messages`   | `getMessages`      | `paginationQueryDto` (query)  | `messageResponseDto[]`        |
| `GET`  | `/ai/sessions/:id/transcript` | `exportTranscript` | `transcriptQueryDto` (query)  | `transcriptResponseDto`       |
| `PUT`  | `/ai/sessions/:id/end`        | `end`              | --                            | 204 No Content                |

## Query Parameters

### `sessionListQueryDto`

All fields are optional. Omitting every field returns all sessions.

| Field      | Type     | Description                                              |
| ---------- | -------- | -------------------------------------------------------- |
| `userId`   | `string` | Filter by user                                           |
| `tenantId` | `string` | Filter by tenant                                         |
| `purpose`  | `string` | Filter by purpose tag                                    |
| `status`   | `string` | Filter by lifecycle status (`active`, `paused`, `ended`) |

### `paginationQueryDto`

| Field     | Type     | Default | Description                       |
| --------- | -------- | ------- | --------------------------------- |
| `page`    | `number` | --      | Page number (positive integer)    |
| `perPage` | `number` | --      | Items per page (positive integer) |

### `transcriptQueryDto`

| Field    | Type               | Default | Description                      |
| -------- | ------------------ | ------- | -------------------------------- |
| `format` | `'json' \| 'text'` | `json`  | Output format for the transcript |

## Response Schemas

### `sessionResponseDto`

Full session record with all fields: `id`, `mastraThreadId`, `userId`, `tenantId`, `promptSlug`, `resolvedPrompt`, `purpose`, `status`, `metadata`, `startedAt`, `endedAt`.

### `sessionSummaryResponseDto`

Lightweight projection for list results: `id`, `userId`, `promptSlug`, `purpose`, `status`, `startedAt`.

### `messageResponseDto`

| Field       | Type     | Required |
| ----------- | -------- | -------- |
| `id`        | `string` | no       |
| `role`      | `string` | yes      |
| `content`   | `string` | yes      |
| `createdAt` | `string` | no       |

### `transcriptResponseDto`

| Field      | Type                   | Required |
| ---------- | ---------------------- | -------- |
| `format`   | `'json' \| 'text'`     | yes      |
| `content`  | `string`               | no       |
| `messages` | `messageResponseDto[]` | no       |

## Stubs

`getMessages` and `exportTranscript` are stubbed at the app layer. The router validates the session exists (returning 404 if not found) but returns empty data until the Mastra mediator contracts are wired.
