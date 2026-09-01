export async function refineWithAnthropic(text: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Convert the following text into clean, well-structured Markdown. Preserve meaning; only add headings/lists where structurally implied. Return only the markdown, no commentary.\n\n${text}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic failed: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? '';
}
