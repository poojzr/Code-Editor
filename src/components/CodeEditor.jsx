import React, { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

export default function CodeEditor({ file, onChange, onSave, onEditorReady }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const onEditorReadyRef = useRef(onEditorReady);

  
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady;
  }, [onEditorReady]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      if (onChangeRef.current) {
        onChangeRef.current(value);
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSaveRef.current) {
        onSaveRef.current();
      }
    });

    if (onEditorReadyRef.current) {
      onEditorReadyRef.current(editor, monaco);
    }
  };

  const handleWillMount = (monaco) => {
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e2e',
        'editor.foreground': '#cdd6f4',
        'editor.lineHighlightBackground': '#313244',
        'editor.selectionBackground': '#45475a',
        'editor.inactiveSelectionBackground': '#45475a',
      }
    });
  };

  if (!file) {
    return null;
  }

  return (
    <div className="h-full w-full" key={file.id}>
      <Editor
        height="100%"
        path={file.path}
        defaultLanguage={file.language || "plaintext"}
        defaultValue={file.content}
        theme="custom-dark"
        onMount={handleEditorDidMount}
        beforeMount={handleWillMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Consolas, monospace',
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          renderWhitespace: 'selection',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: true,
          smoothScrolling: true,
          fontLigatures: true,
        }}
      />
    </div>
  );
}