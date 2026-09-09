'use client';

import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { EditorView } from '@codemirror/view';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
}

// Custom paste handler to normalize carriage returns and line separators
const pasteHandler = EditorView.domEventHandlers({
  paste(event, view) {
    const clipboardText = event.clipboardData?.getData('text/plain');
    if (!clipboardText) return false;

    // If text contains carriage returns or unicode line separators, normalize to \n
    if (/[\r\u2028\u2029]/.test(clipboardText)) {
      event.preventDefault();
      const normalized = clipboardText
        .replace(/\r\n/g, '\n')
        .replace(/[\r\u2028\u2029]/g, '\n');

      view.dispatch(view.state.replaceSelection(normalized));
      return true;
    }
    return false;
  },
});

// Custom theme for the crayon aesthetic
const crayonTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '15px',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: "'Fira Code', monospace",
  },
  '.cm-content': {
    fontFamily: "'Fira Code', monospace",
    caretColor: '#E91E8C',
    whiteSpace: 'pre-wrap !important',
    wordBreak: 'break-word !important',
  },
  '.cm-line': {
    wordBreak: 'break-word !important',
    padding: '1px 4px',
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
  '.cm-placeholder': {
    color: '#A08090 !important',
    fontStyle: 'italic',
    fontFamily: "'Patrick Hand', cursive, sans-serif",
    fontSize: '1.15rem',
  },
});

export default function CodeMirrorEditor({ value, onChange }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={[markdown({ codeLanguages: languages }), crayonTheme, EditorView.lineWrapping, pasteHandler]}
      onChange={(val) => onChange(val)}
      placeholder="Paste your content here..."
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
