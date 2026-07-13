import React, { useRef, useEffect, useCallback } from "react";

export default function CodeEditor({ file, onChange, onSave, onEditorReady }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const monacoRef = useRef(null);
  const isLoadingRef = useRef(false);

  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);

  
  useEffect(() => {
    onChangeRef.current = onChange;
    onSaveRef.current = onSave;
  }, [onChange, onSave]);

  const initMonaco = useCallback(async () => {
    if (!containerRef.current || !file) return;
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;

    try {
      if (!window.monaco) {
        if (!window._monacoLoading) {
          window._monacoLoading = new Promise((resolve) => {
            const script = document.createElement("script");
            script.src =
              "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js";
            script.onload = () => {
              window.require.config({
                paths: {
                  vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs",
                },
              });
              window.require(["vs/editor/editor.main"], () => {
                window.monaco.editor.defineTheme("vscode-dark-custom", {
                  base: "vs-dark",
                  inherit: true,
                  rules: [
                    { token: "comment", foreground: "6A9955" },
                    { token: "keyword", foreground: "569CD6" },
                    { token: "string", foreground: "CE9178" },
                    { token: "number", foreground: "B5CEA8" },
                    { token: "type", foreground: "4EC9B0" },
                  ],
                  colors: {
                    "editor.background": "#1e1e2e",
                    "editor.foreground": "#D4D4D4",
                    "editor.lineHighlightBackground": "#2a2a3e",
                    "editor.selectionBackground": "#264f78",
                    "editorCursor.foreground": "#007acc",
                    "editorLineNumber.foreground": "#858585",
                    "editorLineNumber.activeForeground": "#C6C6C6",
                    "editor.inactiveSelectionBackground": "#3a3d41",
                    "editorIndentGuide.background": "#404040",
                    "editorIndentGuide.activeBackground": "#707070",
                    "editorWidget.background": "#252536",
                    "editorWidget.border": "#414155",
                    "editorSuggestWidget.background": "#252536",
                  },
                });
                resolve();
              });
            };
            script.onerror = () => {
              console.error("Failed to load Monaco editor");
              resolve();
            };
            document.head.appendChild(script);
          });
        }
        await window._monacoLoading;
      }

      if (!containerRef.current || !window.monaco) return;

      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }

      
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (!containerRef.current) return;

      const editor = window.monaco.editor.create(containerRef.current, {
        value: file.content || "",
        language: file.language || "plaintext",
        theme: "vscode-dark-custom",
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 13,
        lineNumbers: "on",
        wordWrap: "on",
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoIndent: "full",
        formatOnPaste: true,
        formatOnType: true,
        suggestOnTriggerCharacters: true,
        tabSize: 2,
        renderWhitespace: "selection",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 8, bottom: 8 },
        scrollbar: {
          verticalSliderSize: 10,
          horizontalSliderSize: 10,
          useShadows: false,
        },
      });

      editor.onDidChangeModelContent(() => {
        onChangeRef.current?.(editor.getValue());
      });

      editor.addCommand(
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.KeyS,
        () => {
          onSaveRef.current?.();
        }
      );

      editorRef.current = editor;
      monacoRef.current = window.monaco;
      onEditorReady?.(editor, window.monaco);

      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      }, 100);
    } catch (error) {
      console.error("Error initializing Monaco editor:", error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [file?.id, file?.language, file?.content, onEditorReady]);

  useEffect(() => {
    initMonaco();
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [initMonaco]);

  
  useEffect(() => {
    if (editorRef.current && monacoRef.current && file) {
      const model = editorRef.current.getModel();
      if (model) {
        const currentValue = model.getValue();
        if (
          file.content !== undefined &&
          currentValue !== file.content &&
          !editorRef.current.hasTextFocus()
        ) {
          model.setValue(file.content || "");
        }
        if (file.language) {
          monacoRef.current.editor.setModelLanguage(model, file.language);
        }
      }
    }
  }, [file?.content, file?.language]);

  
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    };

    window.addEventListener("resize", handleResize);

    let resizeObserver = null;
    if (containerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (editorRef.current) {
          editorRef.current.layout();
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}          
      className="w-full h-full"
      style={{ minHeight: "400px", background: "#1e1e2e" }}
    />
  );
}
