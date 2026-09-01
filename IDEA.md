# Markdown Previewer PWA — Next.js Build Spec

A markdown editor/previewer PWA with local history, theming, AI-assisted
markdown cleanup (multi-provider fallback), PDF/DOCX export, and
export-to-Google-Docs.

---

## 1. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14+ (App Router) | API routes + static frontend in one repo |
| PWA | `next-pwa` | Handles service worker + manifest generation |
| Editor | CodeMirror 6 (`@uiw/react-codemirror`) | Lightweight, mobile-friendly |
| Markdown parser | `unified` + `remark` + `remark-gfm` + `rehype-sanitize` | Extensible, safe HTML output |
| Local history | `Dexie.js` (IndexedDB wrapper) | Simple, offline-first |
| PDF export | `html2pdf.js` (client) | No server round-trip needed |
| DOCX export | `docx` (npm) | Build DOCX from parsed markdown AST |
| AI calls | Server-side only, via API routes | Keeps API keys off the client |
| Google integration | `googleapis` + Google Identity Services | Docs + Drive API |
| Styling/theme | CSS variables + `next-themes` | Light/dark + custom preview themes |

---

## 2. Project structure

```
markdown-pwa/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # main editor/preview page
│   ├── manifest.ts                 # PWA manifest (Next.js native support)
│   ├── api/
│   │   ├── refine/route.ts         # AI markdown cleanup, multi-provider fallback
│   │   ├── google/
│   │   │   ├── auth/route.ts       # OAuth token exchange
│   │   │   └── export/route.ts     # Create Google Doc from markdown
│   ├── globals.css
├── components/
│   ├── Editor.tsx
│   ├── Preview.tsx
│   ├── ThemeSwitcher.tsx
│   ├── HistoryPanel.tsx
│   └── ExportMenu.tsx
├── lib/
│   ├── db.ts                       # Dexie schema
│   ├── markdown.ts                 # unified/remark pipeline
│   ├── exportPdf.ts
│   _  exportDocx.ts
│   ├── aiProviders/
│   │   ├── index.ts                # fallback orchestrator
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   └── gemini.ts
│   └── google.ts                   # Docs/Drive helpers
├── public/
│   └── icons/                      # PWA icons (192, 512, maskable)
├── next.config.js
├── .env.local                      # API keys (never commit)
└── package.json
```

---

## 3. Install dependencies

```bash
npx create-next-app@latest markdown-pwa --typescript --app
cd markdown-pwa

npm install next-pwa
npm install @uiw/react-codemirror @codemirror/lang-markdown
npm install unified remark-parse remark-gfm remark-rehype rehype-sanitize rehype-stringify
npm install dexie dexie-react-hooks
npm install html2pdf.js
npm install docx
npm install googleapis
npm install next-themes
```

---

## 4. PWA setup

**`next.config.js`**
```js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  reactStrictMode: true,
});
```

**`app/manifest.ts`** (Next.js 14+ native manifest route)
```ts
import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Markdown Previewer',
    short_name: 'MDPreview',
    description: 'Write, preview, and export markdown — offline capable.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

---

## 5. Markdown pipeline

**`lib/markdown.ts`**
```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

export async function markdownToHtml(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}
```

---

## 6. Local history (IndexedDB via Dexie)

**`lib/db.ts`**
```ts
import Dexie, { Table } from 'dexie';

export interface DocEntry {
  id?: number;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export class MarkdownDB extends Dexie {
  docs!: Table<DocEntry, number>;

  constructor() {
    super('markdownPwaDb');
    this.version(1).stores({
      docs: '++id, title, updatedAt',
    });
  }
}

export const db = new MarkdownDB();

export async function saveVersion(title: string, content: string) {
  const now = Date.now();
  return db.docs.add({ title, content, createdAt: now, updatedAt: now });
}

export async function listHistory() {
  return db.docs.orderBy('updatedAt').reverse().toArray();
}
```

Usage in a component (`components/HistoryPanel.tsx`) with `useLiveQuery`
from `dexie-react-hooks` gives you reactive updates without extra state
management.

---

## 7. Theming

Use CSS variables scoped to the preview pane, toggled via a `data-theme`
attribute, persisted with `next-themes` or plain `localStorage`.

**`app/globals.css`** (excerpt)
```css
[data-preview-theme="github"] {
  --preview-bg: #ffffff;
  --preview-text: #24292f;
  --preview-code-bg: #f6f8fa;
  --preview-font: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

[data-preview-theme="sepia"] {
  --preview-bg: #f4ecd8;
  --preview-text: #5b4636;
  --preview-code-bg: #ece0c8;
  --preview-font: Georgia, serif;
}

[data-preview-theme="dark"] {
  --preview-bg: #1e1e1e;
  --preview-text: #d4d4d4;
  --preview-code-bg: #2d2d2d;
  --preview-font: "Fira Code", monospace;
}

.preview-pane {
  background: var(--preview-bg);
  color: var(--preview-text);
  font-family: var(--preview-font);
}
```

Keep this theme (the *reading* theme) separate from your app's own
light/dark UI theme — they serve different purposes.

---

## 8. AI refinement with multi-provider fallback

**`lib/aiProviders/anthropic.ts`**
```ts
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
```

Repeat the same shape for `openai.ts` and `gemini.ts`, each exporting a
function with the same signature: `(text: string) => Promise<string>`.

**`lib/aiProviders/index.ts`** — the fallback orchestrator
```ts
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
      continue; // try next provider
    }
  }

  throw new Error(`All providers failed. Last error: ${lastError}`);
}
```

**`app/api/refine/route.ts`**
```ts
import { NextRequest, NextResponse } from 'next/server';
import { refineToMarkdown } from '@/lib/aiProviders';

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

  try {
    const result = await refineToMarkdown(text);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'Refinement failed' }, { status: 502 });
  }
}
```

Call from the client:
```ts
const res = await fetch('/api/refine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: pastedContent }),
});
const { markdown, provider } = await res.json();
```

---

## 9. PDF export (client-side)

**`lib/exportPdf.ts`**
```ts
import html2pdf from 'html2pdf.js';

export function exportToPdf(previewElement: HTMLElement, filename = 'document.pdf') {
  html2pdf()
    .set({
      margin: 10,
      filename,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(previewElement)
    .save();
}
```

---

## 10. DOCX export

**`lib/exportDocx.ts`** (simplified — extend per markdown node type as needed)
```ts
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export async function exportToDocx(markdown: string, filename = 'document.docx') {
  const lines = markdown.split('\n');
  const paragraphs = lines.map((line) => {
    if (line.startsWith('# ')) {
      return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
    }
    if (line.startsWith('## ')) {
      return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
    }
    return new Paragraph({ children: [new TextRun(line)] });
  });

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
```

> For production-quality DOCX conversion (nested lists, tables, code
> blocks), walk the `remark` AST directly instead of splitting by line —
> this simplified version is a starting point.

---

## 11. Google Docs export

### 11a. Google Cloud setup (one-time, in console.cloud.google.com)
1. Create a project → enable **Google Docs API** and **Google Drive API**.
2. Create OAuth 2.0 credentials (Web application type).
3. Add your app's domain to Authorized JavaScript origins and redirect URIs.
4. Note the Client ID and Client Secret.

### 11b. Environment variables
**`.env.local`**
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/auth
```

### 11c. OAuth + export routes

**`lib/google.ts`**
```ts
import { google } from 'googleapis';

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}
```

**`app/api/google/auth/route.ts`**
```ts
import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/google';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const oauth2Client = getOAuthClient();

  if (!code) {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });
    return NextResponse.redirect(url);
  }

  const { tokens } = await oauth2Client.getToken(code);
  // Store tokens securely (session, encrypted cookie, or DB) — not shown here.
  return NextResponse.json({ tokens });
}
```

**`app/api/google/export/route.ts`**
```ts
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient } from '@/lib/google';

export async function POST(req: NextRequest) {
  const { title, markdown, accessToken } = await req.json();

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ access_token: accessToken });

  const docs = google.docs({ version: 'v1', auth: oauth2Client });

  const createRes = await docs.documents.create({ requestBody: { title } });
  const documentId = createRes.data.documentId!;

  // Simplified: insert as plain text. For real heading/list/bold mapping,
  // build batchUpdate requests per markdown node (see remark AST).
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        { insertText: { location: { index: 1 }, text: markdown } },
      ],
    },
  });

  return NextResponse.json({
    documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`,
  });
}
```

> The batchUpdate call above inserts raw text. To preserve markdown
> structure (headings, bold, lists) in the resulting Doc, map each
> `remark` AST node to a Docs API request (`updateParagraphStyle`,
> `updateTextStyle`, `createParagraphBullets`, etc.) instead of one
> `insertText` call.

---

## 12. Suggested build order

1. Editor + live preview + markdown pipeline (no persistence yet)
2. Theming (preview themes + app light/dark)
3. IndexedDB history (save on debounce, list, restore)
4. PDF export → DOCX export
5. AI refine route with one provider, then add fallback providers
6. Google OAuth flow + basic export (plain text)
7. Improve Google export to map markdown structure properly
8. PWA polish: offline fallback page, install prompt, icons

---

## 13. Notes / gotchas

- `next-pwa` disables itself in dev mode by default — test the service worker with `npm run build && npm run start`.
- Google's `insertText` alone won't preserve markdown formatting — budget time for AST → Docs-request mapping if that matters to you.
- Keep all API keys in server-only env vars (no `NEXT_PUBLIC_` prefix) — the refine and Google routes must run server-side only.
- Consider rate-limiting `/api/refine` per user/IP to avoid runaway provider costs.