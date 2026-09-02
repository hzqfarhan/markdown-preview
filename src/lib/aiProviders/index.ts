import { refineWithGemini } from './gemini';
import { refineWithOpenAI } from './openai';
import { refineWithAnthropic } from './anthropic';
import { heuristicTextToMarkdown } from './rules';

type Provider = (text: string) => Promise<string>;

const providers: { name: string; fn: Provider }[] = [
  { name: 'Gemini', fn: refineWithGemini },
  { name: 'OpenAI', fn: refineWithOpenAI },
  { name: 'Anthropic', fn: refineWithAnthropic },
];

const TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

export async function refineToMarkdown(text: string): Promise<{ markdown: string; provider: string }> {
  for (const { name, fn } of providers) {
    try {
      const markdown = await withTimeout(fn(text), TIMEOUT_MS);
      if (markdown?.trim()) return { markdown, provider: name };
    } catch {
      // Continue to next available provider
      continue;
    }
  }

  // Graceful offline fallback: If no API keys are set or all remote providers timed out,
  // execute the built-in heuristic Text-to-Markdown engine
  const offlineFormatted = heuristicTextToMarkdown(text);
  if (offlineFormatted.trim()) {
    return { markdown: offlineFormatted, provider: 'Smart Formatter (Offline)' };
  }

  throw new Error('All AI providers failed and text could not be formatted.');
}
