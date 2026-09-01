export async function refineWithGemini(text: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Convert the following text into clean, well-structured Markdown. Preserve meaning; only add headings/lists where structurally implied. Return only the markdown, no commentary.\n\n${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2000,
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}
