import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';

export interface ProviderResult {
  markdown: string;
  model: string;
  wasFallback: boolean;
  keyUsedIndex?: number;
  totalKeys?: number;
}

let lastSuccessfulModel = 'gemini-3.5-flash-lite';

export function extractApiKeys(raw?: string, envVar?: string): string[] {
  const source = (raw && raw.trim()) || (envVar ? process.env[envVar] : '') || '';
  if (!source) return [];
  return source
    .split(/[\n,;]+/)
    .map((k) => k.replace(/^["']|["']$/g, '').trim())
    .filter((k) => k.length > 0 && !k.startsWith('...'));
}

export async function refineWithGemini(
  text: string,
  customApiKey?: string
): Promise<ProviderResult> {
  const keys = extractApiKeys(customApiKey, 'GEMINI_API_KEY');
  if (keys.length === 0) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Fast lightweight models first for instant responses and generous quotas
  const baseModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-flash-lite-latest',
    'gemini-3.6-flash',
    'gemini-3.8-flash',
  ];

  // Put the last known working model at the very front of the candidate list
  const candidateModels = [
    lastSuccessfulModel,
    ...baseModels.filter((m) => m !== lastSuccessfulModel),
  ];

  let lastError = 'Gemini call failed';

  for (let k = 0; k < keys.length; k++) {
    const apiKey = keys[k];
    const keyLabel = keys.length > 1 ? `Key ${k + 1}/${keys.length}` : 'Key';

    for (let m = 0; m < candidateModels.length; m++) {
      const model = candidateModels[m];
      const isFallback = k > 0 || m > 0;

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            signal: AbortSignal.timeout(12000), // 12s per candidate to prevent long hangs
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: TEXT_TO_MARKDOWN_SYSTEM_PROMPT }],
              },
              contents: [
                {
                  parts: [
                    {
                      text: `Convert the following unformatted text into clean, structured Markdown according to the system rules:\n\n${text}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.2,
              },
            }),
          }
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const errorMsg = errorData?.error?.message || `Status ${res.status}`;
          const isRateLimit =
            res.status === 429 ||
            /quota|resource_exhausted|rate limit|depleted|exhausted/i.test(errorMsg);

          console.warn(
            `[Gemini] [${keyLabel}] Model ${model} failed (${isRateLimit ? 'Quota / Limit' : `Status ${res.status}`}): ${errorMsg}`
          );
          lastError = `[${keyLabel} ${model}] ${errorMsg}`;

          // If the key has depleted credits or quota, switch to next key immediately
          const isKeyExhausted = /prepayment credits are depleted|credit balance|billing/i.test(errorMsg);
          if (isKeyExhausted && k < keys.length - 1) {
            console.warn(`[Gemini] ${keyLabel} credits depleted, switching to next key...`);
            break; // Break inner model loop, advance to next key
          }

          continue;
        }

        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (rawText.trim()) {
          lastSuccessfulModel = model;
          return {
            markdown: cleanAIOutput(rawText),
            model,
            wasFallback: isFallback,
            keyUsedIndex: k,
            totalKeys: keys.length,
          };
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[Gemini] [${keyLabel}] Error calling ${model}: ${errMsg}`);
        lastError = `[${keyLabel} ${model}] ${errMsg || 'Network error'}`;
        continue;
      }
    }
  }

  throw new Error(`All Gemini API keys and candidate models failed. ${lastError}`);
}

