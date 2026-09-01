'use client';

import { useEffect, useState, useRef } from 'react';
import { markdownToHtml } from '@/lib/markdown';

interface PreviewProps {
  markdown: string;
  theme: string;
  previewRef?: React.RefObject<HTMLDivElement | null>;
}

export default function Preview({ markdown, theme, previewRef }: PreviewProps) {
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!markdown.trim()) {
        setHtml('');
        return;
      }

      setIsLoading(true);
      try {
        const result = await markdownToHtml(markdown);
        if (!cancelled) setHtml(result);
      } catch (err) {
        console.error('Markdown render error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    // Small debounce so we don't re-render on every keystroke
    const timer = setTimeout(render, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [markdown]);

  if (!markdown.trim()) {
    return (
      <div className="empty-preview" data-preview-theme={theme}>
        <div className="empty-preview-icon">🖍️</div>
        <h3>Nothing to preview yet</h3>
        <p style={{ color: 'var(--crayon-text-muted)', fontSize: 'var(--font-size-base)' }}>
          Start writing markdown on the left and your preview will appear here!
        </p>
      </div>
    );
  }

  return (
    <div data-preview-theme={theme} style={{ height: '100%', overflow: 'auto' }}>
      <div
        ref={previewRef}
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
