'use client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Custom theme for the crayon aesthetic
const crayonTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '15px',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
  '.cm-content': {
    fontFamily: "'Fira Code', monospace",
    caretColor: '#E91E8C',
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#E91E8C',
    borderLeftWidth: '2px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'rgba(186, 104, 200, 0.3) !important',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(233, 30, 140, 0.04)',
  },
  '.cm-gutters': {
    backgroundColor: '#FFF0F5',
    borderRight: '2px solid #E8C8D8',
    color: '#F48FB1',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#FCE4EC',
    color: '#E91E8C',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: '#F3E5F5',
    border: '1px solid #BA68C8',
    color: '#7B1FA2',
  },
});

export default function CodeMirrorEditor({ value, onChange }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={[markdown(), crayonTheme]}
      onChange={(val) => onChange(val)}
      placeholder="Start writing your markdown here..."
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: true,
        highlightActiveLine: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
      }}
    />
  );
}
