import { useState, useCallback, useRef } from "react";
import * as api from "../services/api";

const getLanguageFromPath = (path) => {
  if (!path) return "plaintext";
  const ext = path.split('.').pop().toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", java: "java", c: "c", cpp: "cpp", cs: "csharp",
    go: "go", rs: "rust", rb: "ruby", php: "php", swift: "swift",
    kt: "kotlin", dart: "dart", lua: "lua", pl: "perl", r: "r",
    scala: "scala", groovy: "groovy", jl: "julia", hs: "haskell",
    m: "objective-c", sql: "sql", sh: "shell", ps1: "powershell",
    bash: "shell", zsh: "shell", html: "html", htm: "html",
    css: "css", scss: "scss", less: "less", json: "json",
    xml: "xml", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", vue: "html", svelte: "html", txt: "plaintext",
    csv: "plaintext", dockerfile: "dockerfile",
  };
  return map[ext] || "plaintext";
};

const updateChildrenInTree = (nodes, targetPath, children) => {
  return nodes.map(node => {
    if (node.path === targetPath) return { ...node, children };
    if (node.children) return { ...node, children: updateChildrenInTree(node.children, targetPath, children) };
    return node;
  });
};

const mergeTrees = (newNodes, oldNodes) => {
  const oldMap = new Map((oldNodes || []).map(n => [n.path, n]));
  return newNodes.map(node => {
    const old = oldMap.get(node.path);
    if (old?.children) {
      return { ...node, children: old.children };
    }
    return node;
  });
};

export function useAppState() {
  const [workspace, setWorkspace] = useState(null);
  const [fileTree, setFileTree] = useState([]);
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [bottomPanelVisible, setBottomPanelVisible] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [activeBottomTab, setActiveBottomTab] = useState("terminal");
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [problems, setProblems] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [debugLogs, setDebugLogs] = useState([]);
  const [ports, setPorts] = useState([]);
  const [isDebugging, setIsDebugging] = useState(false);
  const [terminalSessions, setTerminalSessions] = useState([
    { id: "default", name: "bash", history: [], cwd: "" }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState("default");
  const [contextMenu, setContextMenuState] = useState(null);
  const [autoSave, setAutoSave] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const autoSaveTimerRef = useRef(null);

  const openWorkspace = useCallback(async (folderPath) => {
    if (!folderPath) return;
    setShowFolderPicker(false);
    try {
      const info = await api.openWorkspace(folderPath);
      setWorkspace(info);
      const files = await api.getFiles(folderPath);
      setFileTree(files);
      setExpandedPaths(new Set());
      setTerminalSessions([{ id: "default", name: "bash", history: [], cwd: folderPath }]);
      setActiveTerminalId("default");
      setOutputs([]);
      setProblems([]);
      setDebugLogs([]);
      setPorts([]);
    } catch (err) {
      console.error("Failed to open workspace:", err);
      setDebugLogs(prev => [...prev, { type: "error", message: `Failed to open workspace: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, []);

  const refreshExplorer = useCallback(async () => {
    if (!workspace?.path) return;
    try {
      const files = await api.getFiles(workspace.path);
      setFileTree(prev => mergeTrees(files, prev));
    } catch (err) {
      console.error("Failed to refresh:", err);
    }
  }, [workspace]);

  const toggleExpand = useCallback((path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const loadDirectoryChildren = useCallback(async (dirPath) => {
    try {
      const children = await api.getFiles(dirPath);
      setFileTree(prev => updateChildrenInTree(prev, dirPath, children));
    } catch (err) {
      console.error("Failed to load directory:", err);
      setFileTree(prev => updateChildrenInTree(prev, dirPath, []));
      setDebugLogs(prev => [...prev, { type: "error", message: `Failed to load directory: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const openFile = useCallback(async (filePath) => {
    const existing = openFiles.find(f => f.path === filePath);
    if (existing) {
      setActiveFileId(existing.id);
      return;
    }
    try {
      const data = await api.getFile(filePath);
      const newFile = {
        id: `file-${Date.now()}`,
        path: filePath,
        name: filePath.split(/[/\\]/).pop(),
        content: data.content,
        originalContent: data.content,
        language: getLanguageFromPath(filePath),
        dirty: false,
      };
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
    } catch (err) {
      setDebugLogs(prev => [...prev, { type: "error", message: `Failed to open file: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, [openFiles]);

  const closeFile = useCallback((fileId) => {
    setOpenFiles(prev => {
      const idx = prev.findIndex(f => f.id === fileId);
      const next = prev.filter(f => f.id !== fileId);
      if (activeFileId === fileId) {
        const newActive = next[Math.min(idx, next.length - 1)];
        setActiveFileId(newActive?.id || null);
      }
      return next;
    });
  }, [activeFileId]);

  const closeAllFiles = useCallback(() => {
    setOpenFiles([]);
    setActiveFileId(null);
  }, []);

  const closeOtherFiles = useCallback((fileId) => {
    setOpenFiles(prev => prev.filter(f => f.id === fileId));
    setActiveFileId(fileId);
  }, []);

  const setActiveFile = useCallback((fileId) => {
    setActiveFileId(fileId);
  }, []);

  const updateFileContent = useCallback((fileId, content) => {
    setOpenFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, content, dirty: content !== f.originalContent } : f
    ));
    if (autoSave) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        setOpenFiles(prev => {
          const file = prev.find(f => f.id === fileId);
          if (file) {
            api.saveFile(file.path, content).then(() => {
              setOpenFiles(prev2 => prev2.map(f =>
                f.id === fileId ? { ...f, dirty: false, originalContent: content } : f
              ));
            }).catch(() => {});
          }
          return prev;
        });
      }, 1000);
    }
  }, [autoSave]);

  const saveFile = useCallback(async (fileId) => {
    const file = openFiles.find(f => f.id === fileId);
    if (!file) return;
    try {
      await api.saveFile(file.path, file.content);
      setOpenFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, dirty: false, originalContent: file.content } : f
      ));
      setOutputs(prev => [...prev, { type: "info", message: `Saved: ${file.name}`, timestamp: new Date().toISOString() }]);
    } catch (err) {
      setDebugLogs(prev => [...prev, { type: "error", message: `Save failed: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, [openFiles]);

  const saveAllFiles = useCallback(async () => {
    const dirtyFiles = openFiles.filter(f => f.dirty);
    for (const file of dirtyFiles) {
      try {
        await api.saveFile(file.path, file.content);
        setOutputs(prev => [...prev, { type: "info", message: `Saved: ${file.name}`, timestamp: new Date().toISOString() }]);
      } catch (err) {
        setDebugLogs(prev => [...prev, { type: "error", message: `Save failed: ${file.name}: ${err.message}`, timestamp: new Date().toISOString() }]);
      }
    }
    setOpenFiles(prev => prev.map(f => f.dirty ? { ...f, dirty: false, originalContent: f.content } : f));
  }, [openFiles]);

  const createFile = useCallback(async (parentPath, name) => {
    try {
      const fullPath = parentPath ? `${parentPath}/${name}`.replace(/\\/g, "/") : name;
      await api.createFile(fullPath);
      await refreshExplorer();
    } catch (err) {
      setDebugLogs(prev => [...prev, { type: "error", message: `Create file failed: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, [refreshExplorer]);

  const createFolder = useCallback(async (parentPath, name) => {
    try {
      const fullPath = parentPath ? `${parentPath}/${name}`.replace(/\\/g, "/") : name;
      await api.createFolder(fullPath);
      await refreshExplorer();
    } catch (err) {
      setDebugLogs(prev => [...prev, { type: "error", message: `Create folder failed: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, [refreshExplorer]);

  const deleteItem = useCallback(async (path) => {
    try {
      await api.deleteFile(path);
      await refreshExplorer();
      setOpenFiles(prev => prev.filter(f => !f.path.startsWith(path)));
    } catch (err) {
      setDebugLogs(prev => [...prev, { type: "error", message: `Delete failed: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, [refreshExplorer]);

  const renameItem = useCallback(async (oldPath, newName) => {
    try {
      await api.renameFile(oldPath, newName);
      await refreshExplorer();
      setOpenFiles(prev => prev.map(f => {
        if (f.path === oldPath) {
          const parts = oldPath.split(/[/\\]/);
          parts[parts.length - 1] = newName;
          const newPath = parts.join('/');
          return { ...f, path: newPath, name: newName };
        }
        return f;
      }));
    } catch (err) {
      setDebugLogs(prev => [...prev, { type: "error", message: `Rename failed: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, [refreshExplorer]);

  const copyItem = useCallback((path) => {
    setClipboard({ action: "copy", path });
  }, []);

  const pasteItem = useCallback(async (destPath) => {
    if (!clipboard) return;
    try {
      await api.copyFile(clipboard.path, destPath);
      await refreshExplorer();
    } catch (err) {
      setDebugLogs(prev => [...prev, { type: "error", message: `Paste failed: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, [clipboard, refreshExplorer]);

  const runFile = useCallback(async (filePath) => {
    setBottomPanelVisible(true);
    setActiveBottomTab("output");
    const fileName = filePath.split(/[/\\]/).pop();
    setProblems([]);
    setOutputs(prev => [...prev, { type: "info", message: `Running: ${fileName}`, timestamp: new Date().toISOString() }]);
    try {
      const result = await api.runFile(filePath, workspace?.path);
      if (result.stdout) {
        setOutputs(prev => [...prev, { type: "stdout", message: result.stdout, timestamp: new Date().toISOString() }]);
      }
      if (result.stderr) {
        setOutputs(prev => [...prev, { type: "stderr", message: result.stderr, timestamp: new Date().toISOString() }]);
      }
      if (result.problems?.length) {
        setProblems(result.problems);
      } else {
        setProblems([]);
      }
      if (result.port) {
        setPorts(prev => {
          const filtered = prev.filter(p => p.port !== result.port);
          return [...filtered, { port: result.port, url: result.url, process: result.process_name || filePath }];
        });
      }
      setDebugLogs(prev => [...prev, {
        type: result.exit_code === 0 ? "info" : "error",
        message: `Exit code: ${result.exit_code}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setOutputs(prev => [...prev, { type: "error", message: `Run failed: ${err.message}`, timestamp: new Date().toISOString() }]);
      setDebugLogs(prev => [...prev, { type: "error", message: `Run failed: ${err.message}`, timestamp: new Date().toISOString() }]);
    }
  }, [workspace]);

  const startDebug = useCallback(async (filePath) => {
    setIsDebugging(true);
    setBottomPanelVisible(true);
    setActiveBottomTab("debug");
    setDebugLogs(prev => [...prev, { type: "info", message: `Debug session started: ${filePath.split(/[/\\]/).pop()}`, timestamp: new Date().toISOString() }]);
    await runFile(filePath);
  }, [runFile]);

  const stopDebug = useCallback(() => {
    setIsDebugging(false);
    setDebugLogs(prev => [...prev, { type: "info", message: "Debug session stopped", timestamp: new Date().toISOString() }]);
  }, []);

  const executeTerminalCommand = useCallback(async (command, sessionId = "default") => {
    const session = terminalSessions.find(s => s.id === sessionId);
    const cwd = session?.cwd || workspace?.path || "";

    setTerminalSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, history: [...s.history, { type: "input", content: command }] }
        : s
    ));

    try {
      const result = await api.executeTerminal(command, cwd);

      setTerminalSessions(prev => prev.map(s => {
        if (s.id !== sessionId) return s;
        const newHistory = [...s.history];
        if (result.stdout) newHistory.push({ type: "stdout", content: result.stdout });
        if (result.stderr) newHistory.push({ type: "stderr", content: result.stderr });
        return { ...s, history: newHistory, cwd: result.cwd || s.cwd };
      }));
    } catch (err) {
      setTerminalSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, history: [...s.history, { type: "stderr", content: err.message }] }
          : s
      ));
    }
  }, [terminalSessions, workspace]);

  const createTerminalSession = useCallback(() => {
    const id = `term-${Date.now()}`;
    setTerminalSessions(prev => [...prev, { id, name: `terminal ${prev.length + 1}`, history: [], cwd: workspace?.path || "" }]);
    setActiveTerminalId(id);
    return id;
  }, [workspace]);

  const clearTerminal = useCallback((sessionId) => {
    setTerminalSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, history: [] } : s
    ));
  }, []);

  const closeTerminalSession = useCallback((sessionId) => {
    setTerminalSessions(prev => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex(s => s.id === sessionId);
      const next = prev.filter(s => s.id !== sessionId);
      if (activeTerminalId === sessionId) {
        setActiveTerminalId(next[Math.min(idx, next.length - 1)].id);
      }
      return next;
    });
  }, [activeTerminalId]);

  const searchFiles = useCallback(async (query) => {
    if (!workspace?.path) return [];
    try {
      return await api.searchFiles(workspace.path, query);
    } catch {
      return [];
    }
  }, [workspace]);

  const setContextMenu = useCallback((menu) => setContextMenuState(menu), []);
  const clearContextMenu = useCallback(() => setContextMenuState(null), []);
  const toggleAutoSave = useCallback(() => setAutoSave(v => !v), []);

  const refreshPorts = useCallback(async () => {
    try {
      const freshPorts = await api.getPorts();
      setPorts(freshPorts);
    } catch {}
  }, []);

  const clearOutput = useCallback(() => setOutputs([]), []);
  const clearProblems = useCallback(() => setProblems([]), []);
  const clearDebugLogs = useCallback(() => setDebugLogs([]), []);

  return {
    workspace, openFiles, activeFileId, sidebarVisible, sidebarWidth,
    bottomPanelVisible, bottomPanelHeight, activeBottomTab, problems,
    outputs, debugLogs, ports, terminalSessions, activeTerminalId,
    showFolderPicker, contextMenu, fileTree, autoSave, clipboard,
    expandedPaths, isDebugging,
    setSidebarWidth, setBottomPanelHeight, setActiveBottomTab,
    setSidebarVisible, setBottomPanelVisible,
    setShowFolderPicker, setActiveTerminalId,
    openFile, closeFile, setActiveFile, saveFile, saveAllFiles, updateFileContent,
    createFile, createFolder, deleteItem, renameItem, copyItem, pasteItem,
    openWorkspace, refreshExplorer, runFile, executeTerminalCommand,
    setContextMenu, clearContextMenu, searchFiles, closeAllFiles,
    closeOtherFiles, toggleAutoSave, collapseAll, refreshPorts,
    toggleExpand, loadDirectoryChildren,
    createTerminalSession, clearTerminal, closeTerminalSession,
    startDebug, stopDebug,
    clearOutput, clearProblems, clearDebugLogs,
  };
}