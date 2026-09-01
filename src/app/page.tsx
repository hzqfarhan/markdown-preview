'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Preview from '@/components/Preview';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import ExportMenu from '@/components/ExportMenu';
import HistoryPanel from '@/components/HistoryPanel';
import Toast, { ToastData } from '@/components/Toast';
import { saveVersion, updateDoc, DocEntry } from '@/lib/db';
import { exportToPdf } from '@/lib/exportPdf';
import { exportToDocx } from '@/lib/exportDocx';

// Dynamic import Editor to avoid SSR
const Editor = dynamic(() => import('@/components/Editor'), { ssr: false });

const DEFAULT_MARKDOWN = `# Welcome to Markdown Previewer 🖍️

Write your **markdown** here and see it come to life!

## Features

- ✏️ **Live Preview** — See changes as you type
- 🎨 **Crayon Themes** — Switch between reading styles
- 📚 **History** — Auto-saved, never lose your work
- 📤 **Export** — PDF, DOCX, or Google Docs
- 🤖 **AI Refine** — Clean up messy text into markdown
- 📱 **PWA** — Install and use offline

## Try some markdown

\`\`\`javascript
function hello() {
  console.log("Hello, world! 🌍");
}
\`\`\`

> "The best way to predict the future is to create it." — Peter Drucker

### A table

| Feature | Status |
|---------|--------|
| Editor  | ✅ Done |
| Preview | ✅ Done |
| Export  | ✅ Done |
| AI      | ✅ Done |

---

*Happy writing!* 🎉
`;

export default function Home() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [previewTheme, setPreviewTheme] = useState('crayon');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);
  const [docTitle, setDocTitle] = useState('Untitled');
  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('previewTheme');
    if (saved) setPreviewTheme(saved);
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('previewTheme', previewTheme);
  }, [previewTheme]);

  // Toast helper
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Auto-save with debounce
  const handleChange = useCallback(
    (value: string) => {
      setMarkdown(value);
      setIsSaved(false);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const title = extractTitle(value);
          setDocTitle(title);

          if (currentDocId) {
            await updateDoc(currentDocId, title, value);
          } else {
            const id = await saveVersion(title, value);
            setCurrentDocId(id);
          }
          setIsSaved(true);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }, 2000);
    },
    [currentDocId]
  );

  // Extract title from first heading
  function extractTitle(md: string): string {
    const match = md.match(/^#\s+(.+)$/m);
    return match ? match[1].replace(/[*_~`]/g, '').trim() : 'Untitled';
  }

  // Restore from history
  function handleRestore(doc: DocEntry) {
    setMarkdown(doc.content);
    setCurrentDocId(doc.id!);
    setDocTitle(doc.title);
    setIsSaved(true);
    setHistoryOpen(false);
    addToast(`Restored "${doc.title}"`, 'success');
  }

  // New document
  function handleNewDoc() {
    setMarkdown('');
    setCurrentDocId(null);
    setDocTitle('Untitled');
    setIsSaved(true);
    addToast('New document created', 'info');
  }

  // Export PDF
  async function handleExportPdf() {
    if (!previewRef.current) {
      addToast('Preview pane not available', 'error');
      return;
    }
    try {
      await exportToPdf(previewRef.current, `${docTitle}.pdf`);
      addToast('PDF exported! 📕', 'success');
    } catch (err) {
      addToast('PDF export failed', 'error');
    }
  }

  // Export DOCX
  async function handleExportDocx() {
    try {
      await exportToDocx(markdown, `${docTitle}.docx`);
      addToast('DOCX exported! 📘', 'success');
    } catch (err) {
      addToast('DOCX export failed', 'error');
    }
  }

  // Export Google Docs
  function handleExportGoogleDocs() {
    // Check if we have a Google token (from OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('google_token');

    if (!token) {
      // Redirect to OAuth
      window.location.href = '/api/google/auth';
      return;
    }

    fetch('/api/google/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: docTitle,
        markdown,
        accessToken: token,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          window.open(data.url, '_blank');
          addToast('Exported to Google Docs! 📗', 'success');
        } else {
          addToast('Google Docs export failed', 'error');
        }
      })
      .catch(() => addToast('Google Docs export failed', 'error'));
  }

  // AI Refine
  async function handleRefine() {
    if (!markdown.trim()) {
      addToast('Nothing to refine', 'info');
      return;
    }

    setIsRefining(true);
    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: markdown }),
      });

      if (!res.ok) throw new Error('Refinement failed');

      const { markdown: refined, provider } = await res.json();
      setMarkdown(refined);
      setIsSaved(false);
      addToast(`Refined with ${provider} ✨`, 'success');
    } catch (err) {
      addToast('AI refinement failed — check API keys', 'error');
    } finally {
      setIsRefining(false);
    }
  }

  // Word & char count
  const charCount = markdown.length;
  const wordCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <span className="app-logo-icon">🖍️</span>
          <span>Markdown Previewer</span>
        </div>

        <div className="app-toolbar">
          <ThemeSwitcher value={previewTheme} onChange={setPreviewTheme} />

          <button
            className="btn btn-ghost btn-icon wiggle"
            onClick={handleNewDoc}
            title="New document"
          >
            📄
          </button>

          <button
            className={`btn btn-ai btn-sm ${isRefining ? 'disabled' : ''}`}
            onClick={handleRefine}
            disabled={isRefining}
            title="Refine with AI"
          >
            {isRefining ? <span className="spinner" /> : '✨'}
            {isRefining ? 'Refining...' : 'AI Refine'}
          </button>

          <ExportMenu
            onExportPdf={handleExportPdf}
            onExportDocx={handleExportDocx}
            onExportGoogleDocs={handleExportGoogleDocs}
          />

          <button
            className="btn btn-ghost btn-icon wiggle"
            onClick={() => setHistoryOpen(true)}
            title="Document history"
          >
            📚
          </button>
        </div>
      </header>

      {/* Mobile tabs */}
      <div className="mobile-tabs">
        <button
          className={`mobile-tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          ✏️ Editor
        </button>
        <button
          className={`mobile-tab ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </button>
      </div>

      {/* Main content — split pane */}
      <main className="app-main">
        <div className="split-pane">
          <div className={`pane pane-editor ${activeTab !== 'editor' ? 'hidden-mobile' : ''}`}>
            <Editor value={markdown} onChange={handleChange} />
          </div>

          <div className="pane-divider" />

          <div className={`pane pane-preview ${activeTab !== 'preview' ? 'hidden-mobile' : ''}`}>
            <Preview markdown={markdown} theme={previewTheme} previewRef={previewRef} />
          </div>
        </div>
      </main>

      {/* Status bar */}
      <footer className="status-bar">
        <div className="status-bar-left">
          <span>
            <span className={`status-dot ${isSaved ? 'status-dot-saved' : 'status-dot-unsaved'}`} />
            {isSaved ? 'Saved' : 'Unsaved'}
          </span>
          <span>{docTitle}</span>
        </div>
        <div className="status-bar-right">
          <span>{wordCount} words</span>
          <span>{charCount} chars</span>
        </div>
      </footer>

      {/* History drawer */}
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestore}
      />

      {/* Toasts */}
      <Toast toasts={toasts} />
    </div>
  );
}
