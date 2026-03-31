import type { AiConfig } from '@/config.js';

type OpenAiCompatibleProvider = NonNullable<AiConfig['sttProvider']>;

const OPENAI_BASE_URL = 'https://api.openai.com';

function stripVersionSuffix(url: string): string {
  let normalized = url;
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  if (normalized.endsWith('/v1')) {
    normalized = normalized.slice(0, -3);
  }
  return normalized;
}

function isOpenAiUrl(url: string): boolean {
  return stripVersionSuffix(url) === OPENAI_BASE_URL;
}

export function resolveOpenAiCompatibleProvider(
  provider: OpenAiCompatibleProvider | undefined,
  env: NodeJS.ProcessEnv = process.env,
): OpenAiCompatibleProvider {
  const normalizedUrl = provider?.url ? stripVersionSuffix(provider.url) : OPENAI_BASE_URL;
  const apiKey =
    provider?.apiKey ??
    (isOpenAiUrl(normalizedUrl) ? env.OPENAI_API_KEY : undefined);

  return {
    url: normalizedUrl,
    ...(apiKey !== undefined ? { apiKey } : {}),
    ...(provider?.headers !== undefined ? { headers: provider.headers } : {}),
  };
}
