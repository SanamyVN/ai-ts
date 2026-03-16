# Configuration

`aiConfigSchema` defines runtime settings for `@sanamyvn/ai-ts`. Parse it with Zod and bind the result to `AI_CONFIG`.

## Schema Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultModel` | `string` | `'anthropic/claude-sonnet-4-20250514'` | Model identifier passed to the Mastra agent |
| `prompt.maxVersions` | `number` | `50` | Maximum versions retained per prompt template |
| `session.transcriptPageSize` | `number` | `100` | Messages per page in transcript export |

## Providing Config

Call `aiConfigSchema.parse()` to validate and apply defaults, then bind the result to `AI_CONFIG`:

```typescript
import { AI_CONFIG, aiConfigSchema } from '@sanamyvn/ai-ts/config';
import { value } from '@sanamyvn/foundation/di/core/providers';

value(AI_CONFIG, aiConfigSchema.parse({ defaultModel: 'openai/gpt-4o' }));
```

`parse()` fills in defaults for any omitted fields, so you only need to specify what you want to override.

## Types

```typescript
import type { AiConfig, AiConfigInput } from '@sanamyvn/ai-ts/config';
```

- `AiConfig` — the parsed output type (all fields present with their defaults resolved)
- `AiConfigInput` — the input type accepted by `aiConfigSchema.parse()` (all fields optional)
