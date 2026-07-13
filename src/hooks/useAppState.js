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
        const entryPath = path ? `${path}/${name}` : name;
        let isDirectory = false;
        try {
          await handle.getDirectoryHandle(name, { create: false });
          isDirectory = true;
        } catch {
          isDirectory = false;
        }
        if (handle.kind === 'directory') {
          isDirectory = true;
        }
        
        entries.push({
          name: name,
          path: entryPath,
          type: isDirectory ? 'directory' : 'file',
          children: isDirectory ? [] : undefined,
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
        path: folderPath,
        name: folderPath,
        exists: true
      };
      setWorkspace(info);
      
      const entries = await readDirectory(dirHandle);
      setFileTree(entries);
      
      setExpandedPaths(new Set([folderPath]));
      setTerminalSessions([{ id: "default", name: "bash", history: [], cwd: folderPath }]);
      setActiveTerminalId("default");
      setOutputs([]);
      setProblems([]);
      setDebugLogs([]);
      setPorts([]);
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
    try {
      const dirHandle = getDirHandle();
      const parts = dirPath.split('/');
      let currentHandle = dirHandle;
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }
      }
      const entries = await readDirectory(currentHandle, dirPath);
      setFileTree(prev => updateChildrenInTree(prev, dirPath, entries));
    } catch (err) {
      console.error("Failed to load directory:", err);
      setFileTree(prev => updateChildrenInTree(prev, dirPath, []));
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
      const dirHandle = getDirHandle();
      const parts = filePath.split('/');
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
        id: `file-${Date.now()}`,
        path: filePath,
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
      } else {
        await api.saveFile(file.path, file.content);
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
      const parts = parentPath ? parentPath.split('/').filter(Boolean) : [];
      let currentHandle = dirHandle;
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }
      }
      await currentHandle.getFileHandle(name, { create: true });
      await refreshExplorer();
    } catch (err) {
      setDebugLogs(prev => [...prev, { 
        type: "error", 
        message: `Create file failed: ${err.message}`, 
        timestamp: new Date().toISOString() 
      }]);
    }
  }, [refreshExplorer]);

  const createFolder = useCallback(async (parentPath, name) => {
    try {
      const dirHandle = getDirHandle();
      const parts = parentPath ? parentPath.split('/').filter(Boolean) : [];
      let currentHandle = dirHandle;
      for (const part of parts) {
        if (part) {
          currentHandle = await currentHandle.getDirectoryHandle(part);
        }
      }
      await currentHandle.getDirectoryHandle(name, { create: true });
      await refreshExplorer();
    } catch (err) {
      setDebugLogs(prev => [...prev, { 
        type: "error", 
        message: `Create folder failed: ${err.message}`, 
        timestamp: new Date().toISOString() 
      }]);
    }
  }, [refreshExplorer]);

  const deleteItem = useCallback(async (path) => {
    try {
      const dirHandle = getDirHandle();
      const parts = path.split('/');
      const name = parts.pop();
      const parentParts = parts.filter(Boolean);
      let parentHandle = dirHandle;
      for (const part of parentParts) {
        if (part) {
          parentHandle = await parentHandle.getDirectoryHandle(part);
        }
      }
      await parentHandle.removeEntry(name, { recursive: true });
      await refreshExplorer();
      setOpenFiles(prev => prev.filter(f => !f.path.startsWith(path)));
    } catch (err) {
      setDebugLogs(prev => [...prev, { 
        type: "error", 
        message: `Delete failed: ${err.message}`, 
        timestamp: new Date().toISOString() 
      }]);
    }
  }, [refreshExplorer]);

  const renameItem = useCallback(async (oldPath, newName) => {
    try {
      const dirHandle = getDirHandle();
      const parts = oldPath.split('/');
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
      
      await refreshExplorer();
      setOpenFiles(prev => prev.map(f => {
        if (f.path === oldPath) {
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
  }, [refreshExplorer]);

  const copyItem = useCallback((path) => {
    setClipboard({ action: "copy", path });
  }, []);

  const pasteItem = useCallback(async (destPath) => {
    if (!clipboard) return;
    try {
      const dirHandle = getDirHandle();
      
      const destParts = destPath ? destPath.split('/').filter(Boolean) : [];
      const destName = destParts.pop() || 'copied';
      let destParentHandle = dirHandle;
      for (const part of destParts) {
        if (part) {
          destParentHandle = await destParentHandle.getDirectoryHandle(part);
        }
      }
      
      const sourceParts = clipboard.path.split('/');
      const sourceName = sourceParts.pop();
      const sourceParentParts = sourceParts.filter(Boolean);
      let sourceParentHandle = dirHandle;
      for (const part of sourceParentParts) {
        if (part) {
          sourceParentHandle = await sourceParentHandle.getDirectoryHandle(part);
        }
      }
      
      const sourceHandle = await sourceParentHandle.getFileHandle(sourceName);
      const newPath = destPath ? `${destPath}/${sourceName}` : sourceName;
      await sourceHandle.move(newPath);
      
      await refreshExplorer();
      setClipboard(null);
    } catch (err) {
      setDebugLogs(prev => [...prev, { 
        type: "error", 
        message: `Paste failed: ${err.message}`, 
        timestamp: new Date().toISOString() 
      }]);
    }
  }, [clipboard, refreshExplorer]);

  const runFile = useCallback(async (filePath) => {
    setBottomPanelVisible(true);
    setActiveBottomTab("output");
    const fileName = filePath.split('/').pop();
    setProblems([]);
    setOutputs(prev => [...prev, { type: "info", message: `Running: ${fileName}`, timestamp: new Date().toISOString() }]);
    
    try {
      const openFile = openFiles.find(f => f.path === filePath);
      if (!openFile) {
        setOutputs(prev => [...prev, { type: "error", message: `File not open: ${fileName}`, timestamp: new Date().toISOString() }]);
        return;
      }
      
      const result = await api.runFile(filePath, workspace?.path, openFile.content);
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