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

const stripRoot = (path, rootName) => {
  if (!path) return "";
  if (path === rootName) return "";
  if (path.startsWith(rootName + "/")) {
    return path.slice(rootName.length + 1);
  }
  return path;
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
  const [loadingPaths, setLoadingPaths] = useState(new Set());
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const autoSaveTimerRef = useRef(null);

  const getDirHandle = () => {
    const handle = window.__dirHandle;
    if (!handle) {
      throw new Error("No folder selected. Please open a folder first.");
    }
    return handle;
  };

  const readDirectory = async (dirHandle, path = "") => {
    const entries = [];
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (name.startsWith('.')) continue;
        const entryPath = path ? `${path}/${name}` : name;
        const isDirectory = handle.kind === 'directory';
        entries.push({
          name: name,
          path: entryPath,
          type: isDirectory ? 'directory' : 'file',
          children: isDirectory ? null : undefined,
          handle: handle
        });
      }
    } catch (err) {
      console.error("Error reading directory:", err);
    }
    entries.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
    return entries;
  };

  const openWorkspace = useCallback(async (folderPath) => {
    if (!folderPath) return;
    setShowFolderPicker(false);
    try {
      const dirHandle = getDirHandle();
      const info = {
        path: "",
        name: folderPath,
        exists: true
      };
      setWorkspace(info);
      const entries = await readDirectory(dirHandle);
      setFileTree(entries);
      setExpandedPaths(new Set());
      setTerminalSessions([{ id: "default", name: "bash", history: [], cwd: "" }]);
      setActiveTerminalId("default");
      setOutputs([]);
      setProblems([]);
      setDebugLogs([]);
      setPorts([]);
      setPreview(null);
      setPreviewType(null);
    } catch (err) {
      console.error("Failed to open workspace:", err);
      setDebugLogs(prev => [...prev, {
        type: "error",
        message: `Failed to open workspace: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
      setFileTree([]);
    }
  }, []);

  const refreshExplorer = useCallback(async () => {
    try {
      const dirHandle = getDirHandle();
      const entries = await readDirectory(dirHandle);
      setFileTree(entries);
    } catch (err) {
      console.error("Failed to refresh:", err);
      setFileTree([]);
    }
  }, []);

  const toggleExpand = useCallback((path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const loadDirectoryChildren = useCallback(async (dirPath) => {
    setLoadingPaths(prev => new Set(prev).add(dirPath));
    try {
      const dirHandle = getDirHandle();
      const rootName = dirHandle.name;
      const relativePath = stripRoot(dirPath, rootName);
      const parts = relativePath ? relativePath.split('/').filter(Boolean) : [];
      let currentHandle = dirHandle;
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }
      }
      const entries = await readDirectory(currentHandle, relativePath);
      setFileTree(prev => updateChildrenInTree(prev, dirPath, entries));
    } catch (err) {
      console.error("Failed to load directory:", err);
      setFileTree(prev => updateChildrenInTree(prev, dirPath, []));
    } finally {
      setLoadingPaths(prev => {
        const next = new Set(prev);
        next.delete(dirPath);
        return next;
      });
    }
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const openFile = useCallback(async (filePath) => {
    const dirHandle = getDirHandle();
    const rootName = dirHandle.name;
    const relativePath = stripRoot(filePath, rootName);

    const existing = openFiles.find(f => f.path === relativePath);
    if (existing) {
      setActiveFileId(existing.id);
      return;
    }
    try {
      const parts = relativePath.split('/');
      const fileName = parts.pop();
      let currentHandle = dirHandle;
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }
      }
      const fileHandle = await currentHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      const newFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        path: relativePath,
        name: fileName,
        content: content,
        originalContent: content,
        language: getLanguageFromPath(fileName),
        dirty: false,
        fileHandle: fileHandle
      };
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
    } catch (err) {
      setDebugLogs(prev => [...prev, {
        type: "error",
        message: `Failed to open file: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
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
        saveFile(fileId);
      }, 1000);
    }
  }, [autoSave]);

  const saveFile = useCallback(async (fileId) => {
    const file = openFiles.find(f => f.id === fileId);
    if (!file) return;
    try {
      if (file.fileHandle) {
        const writable = await file.fileHandle.createWritable();
        await writable.write(file.content);
        await writable.close();
      }
      setOpenFiles(prev => prev.map(f =>
        f.id === fileId ? { ...f, dirty: false, originalContent: file.content } : f
      ));
      setOutputs(prev => [...prev, { type: "info", message: `Saved: ${file.name}`, timestamp: new Date().toISOString() }]);
    } catch (err) {
      setDebugLogs(prev => [...prev, {
        type: "error",
        message: `Save failed: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [openFiles]);

  const saveAllFiles = useCallback(async () => {
    const dirtyFiles = openFiles.filter(f => f.dirty);
    for (const file of dirtyFiles) {
      await saveFile(file.id);
    }
  }, [openFiles, saveFile]);

  const createFile = useCallback(async (parentPath, name) => {
    try {
      const dirHandle = getDirHandle();
      const rootName = dirHandle.name;
      const relativeParent = stripRoot(parentPath, rootName);
      const parts = relativeParent ? relativeParent.split('/').filter(Boolean) : [];
      let currentHandle = dirHandle;
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }
      }
      await currentHandle.getFileHandle(name, { create: true });

      if (relativeParent) {
        await loadDirectoryChildren(relativeParent);
      } else {
        const entries = await readDirectory(dirHandle);
        setFileTree(entries);
      }
      setDebugLogs(prev => [...prev, {
        type: "info",
        message: `File created: ${name}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setDebugLogs(prev => [...prev, {
        type: "error",
        message: `Create file failed: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [loadDirectoryChildren]);

  const createFolder = useCallback(async (parentPath, name) => {
    try {
      const dirHandle = getDirHandle();
      const rootName = dirHandle.name;
      const relativeParent = stripRoot(parentPath, rootName);
      const parts = relativeParent ? relativeParent.split('/').filter(Boolean) : [];
      let currentHandle = dirHandle;
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }
      }
      await currentHandle.getDirectoryHandle(name, { create: true });
      if (relativeParent) {
        await loadDirectoryChildren(relativeParent);
      } else {
        const entries = await readDirectory(dirHandle);
        setFileTree(entries);
      }
      setDebugLogs(prev => [...prev, {
        type: "info",
        message: `Folder created: ${name}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setDebugLogs(prev => [...prev, {
        type: "error",
        message: `Create folder failed: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [loadDirectoryChildren]);

  const deleteItem = useCallback(async (path) => {
    try {
      const dirHandle = getDirHandle();
      const rootName = dirHandle.name;
      const relativePath = stripRoot(path, rootName);
      const parts = relativePath.split('/');
      const name = parts.pop();
      const parentParts = parts.filter(Boolean);
      let parentHandle = dirHandle;
      for (const part of parentParts) {
        if (part) {
          parentHandle = await parentHandle.getDirectoryHandle(part);
        }
      }
      await parentHandle.removeEntry(name, { recursive: true });
      const parentPath = parentParts.join('/');
      if (parentPath) {
        await loadDirectoryChildren(parentPath);
      } else {
        const entries = await readDirectory(dirHandle);
        setFileTree(entries);
      }
      setOpenFiles(prev => prev.filter(f => !f.path.startsWith(relativePath)));
      setDebugLogs(prev => [...prev, {
        type: "info",
        message: `Deleted: ${path}`,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setDebugLogs(prev => [...prev, {
        type: "error",
        message: `Delete failed: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [loadDirectoryChildren]);

  const renameItem = useCallback(async (oldPath, newName) => {
    try {
      const dirHandle = getDirHandle();
      const rootName = dirHandle.name;
      const relativePath = stripRoot(oldPath, rootName);
      const parts = relativePath.split('/');
      const oldName = parts.pop();
      const parentParts = parts.filter(Boolean);
      let parentHandle = dirHandle;
      for (const part of parentParts) {
        if (part) {
          parentHandle = await parentHandle.getDirectoryHandle(part);
        }
      }
      const oldHandle = await parentHandle.getFileHandle(oldName);
      await oldHandle.move(newName);
      const parentPath = parentParts.join('/');
      if (parentPath) {
        await loadDirectoryChildren(parentPath);
      } else {
        const entries = await readDirectory(dirHandle);
        setFileTree(entries);
      }
      setOpenFiles(prev => prev.map(f => {
        if (f.path === relativePath) {
          const newPath = parentParts.length > 0 ? `${parentParts.join('/')}/${newName}` : newName;
          return { ...f, path: newPath, name: newName };
        }
        return f;
      }));
    } catch (err) {
      setDebugLogs(prev => [...prev, {
        type: "error",
        message: `Rename failed: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [loadDirectoryChildren]);

  const copyItem = useCallback((path) => {
    setClipboard({ action: "copy", path });
  }, []);

  const pasteItem = useCallback(async (destPath) => {
    if (!clipboard) return;
    try {
      const dirHandle = getDirHandle();
      const rootName = dirHandle.name;

      const relativeDest = stripRoot(destPath, rootName);
      const destParts = relativeDest ? relativeDest.split('/').filter(Boolean) : [];
      let destDirHandle = dirHandle;
      for (const part of destParts) {
        if (part) {
          destDirHandle = await destDirHandle.getDirectoryHandle(part);
        }
      }

      const sourceRelative = stripRoot(clipboard.path, rootName);
      const sourceParts = sourceRelative.split('/');
      const sourceName = sourceParts.pop();
      const sourceParentParts = sourceParts.filter(Boolean);
      let sourceParentHandle = dirHandle;
      for (const part of sourceParentParts) {
        if (part) {
          sourceParentHandle = await sourceParentHandle.getDirectoryHandle(part);
        }
      }
      const sourceHandle = await sourceParentHandle.getFileHandle(sourceName);

      await sourceHandle.move(destDirHandle, sourceName);

      const sourceParentPath = sourceParentParts.join('/');
      if (sourceParentPath) {
        await loadDirectoryChildren(sourceParentPath);
      } else {
        const entries = await readDirectory(dirHandle);
        setFileTree(entries);
      }
      if (relativeDest && relativeDest !== sourceParentPath) {
        await loadDirectoryChildren(relativeDest);
      }
      setClipboard(null);
    } catch (err) {
      setDebugLogs(prev => [...prev, {
        type: "error",
        message: `Paste failed: ${err.message}`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [clipboard, loadDirectoryChildren]);

  const runFile = useCallback(async (filePath) => {
    setBottomPanelVisible(true);
    setActiveBottomTab("output");
    const fileName = filePath.split('/').pop();
    setProblems([]);
    setOutputs(prev => [...prev, { type: "info", message: `Running: ${fileName}`, timestamp: new Date().toISOString() }]);
    try {
      const fileEntry = openFiles.find(f => f.path === filePath);
      if (!fileEntry) {
        setOutputs(prev => [...prev, { type: "error", message: `File not open: ${fileName}`, timestamp: new Date().toISOString() }]);
        return;
      }
      const result = await api.runFile(filePath, workspace?.path, fileEntry.content);

      
      if (result.preview) {
        setPreview(result.preview);
        setPreviewType(result.preview_type);
        setActiveBottomTab("preview");
        setBottomPanelVisible(true);
        setOutputs(prev => [...prev, { type: "info", message: `Preview ready: ${fileName}`, timestamp: new Date().toISOString() }]);
        return;
      }

      if (result.stdout) {
        setOutputs(prev => [...prev, { type: "stdout", message: result.stdout, timestamp: new Date().toISOString() }]);
      }
      if (result.stderr) {
        setOutputs(prev => [...prev, { type: "stderr", message: result.stderr, timestamp: new Date().toISOString() }]);
      }
      if (result.problems?.length) {
        setProblems(result.problems);
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
  }, [workspace, openFiles]);

  
  const clearPreview = useCallback(() => {
    setPreview(null);
    setPreviewType(null);
  }, []);

  const startDebug = useCallback(async (filePath) => {
    setIsDebugging(true);
    setBottomPanelVisible(true);
    setActiveBottomTab("debug");
    setDebugLogs(prev => [...prev, { type: "info", message: `Debug session started: ${filePath.split('/').pop()}`, timestamp: new Date().toISOString() }]);
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
    expandedPaths, isDebugging, loadingPaths,
    preview, previewType, clearPreview,
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