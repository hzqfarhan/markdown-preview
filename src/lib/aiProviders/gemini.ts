import { TEXT_TO_MARKDOWN_SYSTEM_PROMPT, cleanAIOutput } from './rules';

export async function refineWithGemini(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('...') || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
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
          maxOutputTokens: 4000,
          temperature: 0.2,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);
  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return cleanAIOutput(rawText);
}
