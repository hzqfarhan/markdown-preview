export async function refineWithOpenAI(text: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a markdown formatting assistant. Convert text into clean, well-structured Markdown. Preserve meaning; only add headings/lists where structurally implied. Return only the markdown, no commentary.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}
