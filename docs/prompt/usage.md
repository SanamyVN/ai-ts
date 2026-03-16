# Prompt -- Usage

How to create prompt templates, manage versions, resolve templates with parameters, and handle errors.

## Create a Prompt Template

```typescript
const prompt = await promptService.create({
  name: 'Greeting',
  slug: 'greeting',
  parameterSchema: {
    topic: { type: 'string' },
    count: { type: 'number', min: 1, max: 10 },
  },
  metadata: { team: 'onboarding' },
});
```

`parameterSchema` defines the parameters the template accepts. Each key maps to a field definition with a required `type` (`"string"` or `"number"`) and optional `min`/`max` bounds for numbers. When a template is resolved, parameters are validated against this schema. Both `parameterSchema` and `metadata` are optional.

The returned `PromptTemplate` contains the generated `id`, timestamps, and the fields you provided.

## Manage Versions

Each prompt template holds multiple versions. Only one version is active at a time.

### Create a version

```typescript
const version = await promptService.createVersion(prompt.id, {
  template: 'Hello {{name}}, welcome to {{topic}}!',
  activate: true,
});
```

Set `activate: true` to make this version the active one immediately. Version numbers auto-increment; you never set them yourself.

### List versions

```typescript
const versions = await promptService.listVersions(prompt.id);
// versions[0].version  -> 1
// versions[0].isActive -> true
```

### Change the active version

```typescript
await promptService.setActiveVersion(prompt.id, olderVersionId);
```

This deactivates the current active version and activates the specified one.

## Resolve a Template

`resolve` finds the active version, validates parameters against `parameterSchema`, and renders the template with Mustache.

```typescript
const result = await promptService.resolve('greeting', {
  name: 'World',
  topic: 'AI',
});
// result.slug    -> 'greeting'
// result.version -> 1
// result.text    -> 'Hello World, welcome to AI!'
```

The returned `ResolvedPrompt` contains three fields: the prompt `slug`, the `version` number used, and the rendered `text`.

## Error Handling

All errors extend `PromptError`. Import them from `@sanamyvn/ai-ts/business/prompt/error`.

| Error                          | When                                           | Type Guard                     |
| ------------------------------ | ---------------------------------------------- | ------------------------------ |
| `PromptNotFoundError`          | Slug not found or no active version            | `isPromptNotFoundError()`      |
| `PromptAlreadyExistsError`     | Duplicate slug on create                       | `isPromptAlreadyExistsError()` |
| `PromptVersionNotFoundError`   | Version ID not found during `setActiveVersion` | --                             |
| `InvalidPromptParametersError` | Parameters fail schema validation              | --                             |
| `PromptRenderError`            | Mustache rendering fails                       | --                             |

```typescript
import {
  isPromptNotFoundError,
  isPromptAlreadyExistsError,
} from '@sanamyvn/ai-ts/business/prompt/error';

try {
  await promptService.resolve('nonexistent', {});
} catch (error) {
  if (isPromptNotFoundError(error)) {
    // error.identifier contains the slug or description
  }
}
```
