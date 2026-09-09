import { refineWithGemini, ProviderResult } from './gemini';
import { refineWithOpenAI } from './openai';
import { refineWithAnthropic } from './anthropic';
import { heuristicTextToMarkdown } from './rules';

export interface RefineOptions {
  customKeys?: {
    gemini?: string;
    openai?: string;
    anthropic?: string;
    [key: string]: string | undefined;
  };
  preferredProvider?: 'Gemini' | 'OpenAI' | 'Anthropic' | string;
  customKey?: string;
}

type ProviderFn = (text: string, customKey?: string) => Promise<ProviderResult>;

interface ProviderEntry {
  name: string;
  fn: ProviderFn;
  keyName: string;
}

const allProviders: ProviderEntry[] = [
  { name: 'Gemini', fn: refineWithGemini, keyName: 'gemini' },
  { name: 'OpenAI', fn: refineWithOpenAI, keyName: 'openai' },
  { name: 'Anthropic', fn: refineWithAnthropic, keyName: 'anthropic' },
];

const TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Provider request timed out')), ms)
    ),
  ]);
}

export async function refineToMarkdown(
  text: string,
  options?: RefineOptions
): Promise<{ markdown: string; provider: string }> {
  // Order providers according to preferredProvider if specified
  const orderedProviders = [...allProviders];
  if (options?.preferredProvider) {
    const pref = options.preferredProvider.toLowerCase();
    const matchIndex = orderedProviders.findIndex(
      (p) => p.name.toLowerCase() === pref
    );
    if (matchIndex > 0) {
      const [matched] = orderedProviders.splice(matchIndex, 1);
      orderedProviders.unshift(matched);
    }
  }

  const errors: string[] = [];

  for (const { name, fn } of orderedProviders) {
    // Check if custom key was passed for this provider
    const customKey =
      (options?.preferredProvider?.toLowerCase() === name.toLowerCase()
        ? options?.customKey
        : undefined) ||
      options?.customKeys?.[name] ||
      options?.customKeys?.[name.toLowerCase()];

    try {
      const result = await withTimeout(fn(text, customKey), TIMEOUT_MS);
      if (result?.markdown?.trim()) {
        const keyInfo =
          result.totalKeys && result.totalKeys > 1
            ? ` - Key ${(result.keyUsedIndex ?? 0) + 1}`
            : '';
        const fallbackInfo = result.wasFallback ? ' fallback' : '';
        const providerLabel = `${name} (${result.model}${keyInfo}${fallbackInfo})`;
        return { markdown: result.markdown, provider: providerLabel };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${name}: ${errMsg || 'Failed'}`);
      continue;
    }
  }

  // Graceful offline fallback: If no API keys are set or all remote providers failed,
  // execute the built-in heuristic Text-to-Markdown engine
  const offlineFormatted = heuristicTextToMarkdown(text);
  if (offlineFormatted.trim()) {
    return {
      markdown: offlineFormatted,
      provider: 'Smart Formatter (Offline)',
    };
  }

  throw new Error(`All AI providers failed: ${errors.join('; ')}`);
}
