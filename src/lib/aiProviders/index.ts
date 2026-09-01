import { refineWithAnthropic } from './anthropic';
import { refineWithOpenAI } from './openai';
import { refineWithGemini } from './gemini';

type Provider = (text: string) => Promise<string>;

const providers: { name: string; fn: Provider }[] = [
  { name: 'anthropic', fn: refineWithAnthropic },
  { name: 'openai', fn: refineWithOpenAI },
  { name: 'gemini', fn: refineWithGemini },
];

const TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

export async function refineToMarkdown(text: string): Promise<{ markdown: string; provider: string }> {
  let lastError: unknown;

  for (const { name, fn } of providers) {
    try {
      const markdown = await withTimeout(fn(text), TIMEOUT_MS);
      if (markdown?.trim()) return { markdown, provider: name };
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw new Error(`All providers failed. Last error: ${lastError}`);
}
