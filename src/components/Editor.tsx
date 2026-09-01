'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import CodeMirror to avoid SSR issues
const CodeMirrorEditor = dynamic(() => import('./CodeMirrorEditor'), {
  ssr: false,
  loading: () => (
    <div className="editor-loading">
      <span className="spinner" />
      <span style={{ fontFamily: 'var(--font-heading)', color: 'var(--crayon-text-muted)' }}>
        Loading editor...
      </span>
    </div>
  ),
});

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function Editor({ value, onChange }: EditorProps) {
  return (
    <div className="editor-wrapper" style={{ height: '100%' }}>
      <CodeMirrorEditor value={value} onChange={onChange} />
    </div>
  );
}
