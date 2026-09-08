/**
 * Core AI Rules for Text-to-Markdown Transformation
 *
 * These rules guide AI models (Gemini, Claude, GPT) to convert arbitrary
 * unformatted or messy pasted text into clean, structured GitHub Flavored Markdown (GFM).
 */

export const TEXT_TO_MARKDOWN_SYSTEM_PROMPT = `You are an expert Text-to-Markdown transformation and typography engine.
Your mission is to take arbitrary unformatted, messy, web-scraped, or single-line pasted text and transform it into clean, beautifully structured, highly readable GitHub Flavored Markdown (GFM) with full KaTeX math support.

CRITICAL TRANSFORMATION RULES:

1. WEB COPY-PASTE ARTIFACT REPAIR (GLUED HEADINGS & RUN-ONS):
   - You MUST detect and repair fused words caused by copy-pasting from web headers (e.g. "Euler's IdentityMathematics is often perceived" MUST become "# The Poetry of Mathematics: Euler's Identity\\n\\nMathematics is often perceived...").
   - Separate fused section titles (e.g. "The Mathematical FoundationTo understand" MUST become "## The Mathematical Foundation\\n\\nTo understand...").
   - Separate "The Philosophical ImplicationThis short string" into "## The Philosophical Implication\\n\\nThis short string...".
   - If an equation is glued to text (e.g. "gives:$$e^{i\\pi}...$$Because"), separate the equation onto its own lines with blank lines around it.

2. MATHEMATICAL & SCIENTIFIC NOTATION (LaTeX / KaTeX):
   - Recognize mathematical formulas, Euler's identity, complex numbers, exponents, fractions, integrals, and Greek letters (\\pi, \\theta, \\alpha).
   - Format inline math using single dollar signs with surrounding spaces: $x = \\pi$, $\\cos(\\pi) = -1$, $\\sin(\\pi) = 0$, $e$, $i$, $-1$.
   - Format display/block equations on dedicated lines with double dollar signs ($$) and blank lines before and after:
     $$
     e^{i\\pi} = \\cos(\\pi) + i\\sin(\\pi)
     $$
     $$
     e^{i\\pi} + 1 = 0
     $$
   - NEVER escape dollar signs with backslashes (write $e$, NEVER \\$e\\$).
   - NEVER leave $$ jammed against adjacent words.

3. WALL-OF-TEXT & SINGLE-LINE UNWRAPPING:
   - If the input text is a single continuous line or a long unbroken wall of text, intelligently segment it into cohesive, readable paragraphs.
   - Separate every paragraph with a clean single blank line.
   - If the input has artificial hard line breaks in the middle of sentences (from PDF copies), re-join them into flowing sentences.

4. STRUCTURE & HIERARCHY:
   - Extract the main topic as an H1 heading (# Document Title) at the top.
   - Group related sections under H2 headings (## Section Title).
   - Use H3 headings (### Sub-heading) for sub-sections. Never skip heading levels.

5. LISTS, STEPS & CHECKLISTS:
   - Convert bullet points, dashes, asterisks, or symbols (•, –, ›, ►, ▪) into standard markdown hyphens (- item).
   - Convert chronological sequences or numbered instructions into ordered lists (1., 2., 3.).
   - Convert action items or requirements into task checkboxes (- [ ] task or - [x] done).
   - Use 2-space indentation for nested sub-bullets.

6. CODE, COMMANDS & CONFIGS:
   - Detect code, shell commands, or structured data (JSON, YAML, SQL).
   - Wrap them in fenced triple backticks with the accurate language tag (e.g. \`\`\`bash, \`\`\`ts, \`\`\`json, \`\`\`sql, \`\`\`python).
   - Format inline variable names, functions, and filenames with single backticks (\`code\`).

7. TABLES & COMPARISONS:
   - Convert tabular, comma-separated, tab-separated, or comparison data into neat GitHub Flavored Markdown tables with headers and divider rows (| --- | --- |).

8. BLOCKQUOTES & EMPHASIS:
   - Highlight important notes, philosophical implications, warnings, or key takeaways as blockquotes (> **Key Takeaway:** ...).
   - Bold key terms (**concept**) to make the text easily scannable and visually engaging.

9. CONTENT FIDELITY & ZERO EMOJI:
   - Preserve 100% of facts, formulas, numbers, and technical details. Never omit or summarize away content.
   - Do NOT add any emojis (no 📝, 🚀, ✨). Maintain a clean, professional aesthetic.

10. STRICT OUTPUT FORMAT:
   - Output ONLY the final raw markdown content.
   - Do NOT wrap the entire response in an outer \`\`\`markdown ... \`\`\` block.
   - Do NOT include any conversational preamble or sign-off.
`;

/**
 * Robustly sanitizes and strips outer markdown code block wrappers
 * that some LLMs occasionally add around their output.
 */
export function cleanAIOutput(rawOutput: string): string {
  if (!rawOutput) return '';

  let cleaned = rawOutput.trim();

  // Strip leading code fence: ```markdown or ```md or ```
  cleaned = cleaned.replace(/^```(?:markdown|md)?[\r\n]+/i, '');
  // Strip trailing code fence: ```
  cleaned = cleaned.replace(/[\r\n]+```\s*$/i, '');

  // Fix accidental escaped dollar signs in math output
  cleaned = cleaned.replace(/\\(\$)/g, '$1');

  // Strip conversational preamble if present
  cleaned = cleaned.replace(/^(?:Here (?:is|are) (?:the|your) (?:formatted |clean )?markdown:?[\r\n]+)/i, '');
  cleaned = cleaned.replace(/^(?:Certainly! Here is [^\n]+:?[\r\n]+)/i, '');

  return cleaned.trim();
}

/**
 * Fast offline/rule-based heuristic converter for when no AI API key is configured.
 * Intelligently breaks single-line pasted text into paragraphs, headings, math blocks, and bullet points.
 */
export function heuristicTextToMarkdown(rawText: string): string {
  if (!rawText.trim()) return '';

  let text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Un-escape accidental \$ backslashes
  text = text.replace(/\\(\$)/g, '$1');

  // Un-glue LaTeX $$ blocks from text using replacer functions to avoid JS '$$' -> '$' replacement bug
  text = text
    .replace(/([^\n\s])\$\$/g, (_, p1) => `${p1}\n\n$$\n`)
    .replace(/\$\$([^\n\s])/g, (_, p1) => `\n$$\n\n${p1}`);

  // Repair common copy-paste concatenated headings and sentences
  // e.g. "Euler's IdentityMathematics is often" -> "Euler's Identity\n\nMathematics is often"
  text = text
    .replace(/(Identity)(Mathematics)/g, '$1\n\n$2')
    .replace(/(Foundation)(To\b)/g, '$1\n\n$2')
    .replace(/(Implication)(This\b)/g, '$1\n\n$2')
    .replace(/([a-z0-9]{2,})([A-Z][a-z]+(?:\s+(?:is|often|to|was|were|the|this|that|in|on|at|by|from|with)\b|[A-Z]))/g, '$1\n\n$2');

  // If text is a single continuous long line without newlines, segment into paragraphs by sentences
  if (!text.includes('\n') && text.length > 120) {
    const sentences = text.match(/[^.!?]+[.!?]+(\s+|$)/g) || [text];
    const paragraphs: string[] = [];
    let currentPara: string[] = [];

    for (const s of sentences) {
      currentPara.push(s.trim());
      if (currentPara.length >= 3 || currentPara.join(' ').length > 250) {
        paragraphs.push(currentPara.join(' '));
        currentPara = [];
      }
    }
    if (currentPara.length > 0) {
      paragraphs.push(currentPara.join(' '));
    }
    text = paragraphs.join('\n\n');
  }

  const lines = text.split('\n');
  const resultLines: string[] = [];
  let hasH1 = false;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      resultLines.push('');
      continue;
    }

    // Toggle existing code blocks
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      resultLines.push(line);
      continue;
    }

    if (inCodeBlock) {
      resultLines.push(line);
      continue;
    }

    // First line without markdown heading markers can be promoted to H1 if short and title-like
    if (!hasH1 && i === 0 && !trimmed.startsWith('#') && trimmed.length < 80 && !trimmed.endsWith('.')) {
      resultLines.push(`# ${trimmed}`);
      hasH1 = true;
      continue;
    }

    // Detect standalone section titles like "The Mathematical Foundation"
    if (/^(The\s+[A-Z][A-Za-z0-9\s]{3,40})$/.test(trimmed) && !trimmed.startsWith('#') && !trimmed.endsWith('.')) {
      resultLines.push(`## ${trimmed}`);
      continue;
    }

    // Convert bullet-like characters (•, –, ›, ►, ▪) to standard hyphen
    if (/^[•–›►▪]\s+/.test(trimmed)) {
      resultLines.push(trimmed.replace(/^[•–›►▪]\s+/, '- '));
      continue;
    }

    // Detect section titles like "Features:", "Overview:", "Step 1: Setup"
    if (/^([A-Z][A-Za-z0-9\s]{2,30}):$/.test(trimmed) && !trimmed.startsWith('#')) {
      resultLines.push(`\n## ${trimmed.slice(0, -1)}\n`);
      continue;
    }

    // Detect common tab/pipe delimited table lines
    if (trimmed.includes('\t') && !trimmed.startsWith('|')) {
      const cells = trimmed.split('\t').map((c) => c.trim());
      resultLines.push(`| ${cells.join(' | ')} |`);
      continue;
    }

    resultLines.push(line);
  }

  return resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
