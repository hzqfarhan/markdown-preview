import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';
import { ProviderResult } from './gemini';

export async function refineWithOpenAI(
  text: string,
  customApiKey?: string
): Promise<ProviderResult> {
  const apiKey = (customApiKey && customApiKey.trim()) || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith('...') || apiKey.trim() === '') {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const candidateModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
  let lastError = 'OpenAI call failed';

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    const isFallback = i > 0;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content: TEXT_TO_MARKDOWN_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: `Convert the following unformatted text into clean, structured Markdown:\n\n${text}`,
            },
          ],
          max_tokens: 8192,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.error?.message || `Status ${res.status}`;
        console.warn(
          `[OpenAI] Model ${model} failed (${res.status}): ${msg}.${
            i < candidateModels.length - 1 ? ` Falling back to ${candidateModels[i + 1]}...` : ''
          }`
        );
        lastError = `[${model}] ${msg}`;
        continue;
      }

      const data = await res.json();
      const rawText = data.choices?.[0]?.message?.content ?? '';
      if (rawText.trim()) {
        return {
          markdown: cleanAIOutput(rawText),
          model,
          wasFallback: isFallback,
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[OpenAI] Error contacting ${model}: ${errMsg}`);
      lastError = `[${model}] ${errMsg || 'Network error'}`;
      continue;
    }
  }

  throw new Error(`All OpenAI candidate models failed. ${lastError}`);
}

