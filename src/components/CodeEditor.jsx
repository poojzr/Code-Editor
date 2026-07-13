import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

export default function CodeEditor({ file, onChange, onSave, onEditorReady }) {
  const editorRef = useRef(null);
  const [content, setContent] = useState(file?.content || "");
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (file) {
      setContent(file.content);
    }
  }, [file]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      setContent(value);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onChange(value);
      }, 300);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave();
    });

    if (onEditorReady) {
      onEditorReady(editor, monaco);
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
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={file.language || "plaintext"}
        value={content}
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