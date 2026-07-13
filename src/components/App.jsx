import React, { useCallback, useEffect, useRef } from "react";
import MenuBar from "./MenuBar";
import ActivityBar from "./ActivityBar";
import Explorer from "./Explorer";
import EditorTabs from "./EditorTabs";
import CodeEditor from "./CodeEditor";
import Terminal from "./Terminal";
import ProblemsPanel from "./ProblemsPanel";
import OutputPanel from "./OutputPanel";
import DebugConsole from "./DebugConsole";
import PortsPanel from "./PortsPanel";
import StatusBar from "./StatusBar";
import ContextMenu from "./ContextMenu";
import { useAppState } from "../hooks/useAppState";

export default function App() {
  const state = useAppState();
  const {
    workspace, openFiles, activeFileId, sidebarVisible, sidebarWidth,
    bottomPanelVisible, bottomPanelHeight, activeBottomTab, problems,
    outputs, debugLogs, ports, terminalSessions, activeTerminalId,
    contextMenu, fileTree, autoSave,
    expandedPaths, isDebugging,
    setSidebarWidth, setBottomPanelHeight, setActiveBottomTab,
    setSidebarVisible, setBottomPanelVisible, 
    openFile, closeFile, setActiveFile, saveFile, saveAllFiles, updateFileContent,
    createFile, createFolder, deleteItem, renameItem, copyItem, pasteItem,
    openWorkspace, refreshExplorer, runFile, executeTerminalCommand,
    setContextMenu, clearContextMenu, closeAllFiles,
    closeOtherFiles, toggleAutoSave, collapseAll, refreshPorts,
    toggleExpand, loadDirectoryChildren,
    createTerminalSession, clearTerminal, closeTerminalSession,
    startDebug, stopDebug, setActiveTerminalId,
  } = state;

  const sidebarResizing = useRef(false);
  const bottomResizing = useRef(false);
  const editorInstanceRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (sidebarResizing.current) {
      const newWidth = Math.max(180, Math.min(600, e.clientX - 48));
      setSidebarWidth(newWidth);
    }
    if (bottomResizing.current) {
      const newHeight = Math.max(100, Math.min(500, window.innerHeight - e.clientY - 22));
      setBottomPanelHeight(newHeight);
    }
  }, [setSidebarWidth, setBottomPanelHeight]);

  const handleMouseUp = useCallback(() => {
    sidebarResizing.current = false;
    bottomResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
       if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.monaco-editor')) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFileId) saveFile(activeFileId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarVisible(v => !v);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setBottomPanelVisible(v => !v);
      }
      if (e.key === 'F5' && !e.shiftKey) {
        e.preventDefault();
        const activeFile = openFiles.find(f => f.id === activeFileId);
        if (activeFile) startDebug(activeFile.path);
      }
      if (e.key === 'F5' && e.shiftKey) {
        e.preventDefault();
        stopDebug();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFileId, saveFile, setSidebarVisible, setBottomPanelVisible, openFiles, startDebug, stopDebug]);

  useEffect(() => {
    if (activeBottomTab === "ports" && bottomPanelVisible) {
      refreshPorts();
      const interval = setInterval(refreshPorts, 5000);
      return () => clearInterval(interval);
    }
  }, [activeBottomTab, bottomPanelVisible, refreshPorts]);

  
  const handleOpenFolder = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Please use Chrome or Edge browser for folder access');
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker();
      
      openWorkspace(dirHandle.name);
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'CancelError') {
        console.error('Error opening folder:', err);
        alert('Could not open folder. Please try again.');
      }
    }
  }, [openWorkspace]);


  const handleShowPanel = useCallback((tab) => {
    setActiveBottomTab(tab);
    setBottomPanelVisible(true);
  }, [setActiveBottomTab, setBottomPanelVisible]);

  const handleEditorReady = useCallback((editor, monaco) => {
    editorInstanceRef.current = { editor, monaco };
  }, []);

  const editorAction = useCallback((actionId) => {
    const { editor } = editorInstanceRef.current || {};
    editor?.trigger("keyboard", actionId, null);
  }, []);

  const handleUndo = useCallback(() => editorAction("undo"), [editorAction]);
  const handleRedo = useCallback(() => editorAction("redo"), [editorAction]);
  const handleFind = useCallback(() => editorAction("actions.find"), [editorAction]);
  const handleReplace = useCallback(() => editorAction("editor.action.startFindReplaceAction"), [editorAction]);
  const handleToggleComment = useCallback(() => editorAction("editor.action.commentLine"), [editorAction]);
  const handleFormatDocument = useCallback(() => editorAction("editor.action.formatDocument"), [editorAction]);
  const handleSelectAll = useCallback(() => editorAction("selectAll"), [editorAction]);

  const handleNewFile = useCallback(() => {
    if (!workspace) { handleOpenFolder(); return; }
    const name = prompt("New file name:");
    if (name) createFile(workspace.path, name).then(() => openFile(`${workspace.path}/${name}`.replace(/\\/g, "/")));
  }, [workspace, createFile, openFile, handleOpenFolder]);

  const handleNewFolder = useCallback(() => {
    if (!workspace) { handleOpenFolder(); return; }
    const name = prompt("New folder name:");
    if (name) createFolder(workspace.path, name);
  }, [workspace, createFolder, handleOpenFolder]);

  const handleSplitTerminal = useCallback(() => {
    createTerminalSession();
    setBottomPanelVisible(true);
    setActiveBottomTab("terminal");
  }, [createTerminalSession, setBottomPanelVisible, setActiveBottomTab]);

  const handleClearTerminal = useCallback(() => {
    clearTerminal(activeTerminalId);
  }, [clearTerminal, activeTerminalId]);

  const activeFile = openFiles.find(f => f.id === activeFileId);

  const bottomTabs = [
    { id: "terminal", label: "Terminal" },
    { id: "problems", label: `Problems${problems.length ? ` (${problems.length})` : ''}` },
    { id: "output", label: "Output" },
    { id: "debug", label: "Debug Console" },
    { id: "ports", label: "Ports" },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e2e] text-[#cccccc] overflow-hidden select-none"
      onClick={() => contextMenu && clearContextMenu()}>
      <MenuBar
        onOpenFolder={handleOpenFolder}
        onNewFile={handleNewFile}
        onNewFolder={handleNewFolder}
        onSave={() => activeFileId && saveFile(activeFileId)}
        onSaveAll={saveAllFiles}
        onCloseAll={closeAllFiles}
        onToggleSidebar={() => setSidebarVisible(v => !v)}
        onToggleBottomPanel={() => setBottomPanelVisible(v => !v)}
        onToggleAutoSave={toggleAutoSave}
        autoSave={autoSave}
        onRunFile={() => activeFile && runFile(activeFile.path)}
        onStartDebug={() => activeFile && startDebug(activeFile.path)}
        onStopDebug={stopDebug}
        isDebugging={isDebugging}
        onNewTerminal={() => { setBottomPanelVisible(true); setActiveBottomTab("terminal"); }}
        onSplitTerminal={handleSplitTerminal}
        onClearTerminal={handleClearTerminal}
        onShowPanel={handleShowPanel}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onFind={handleFind}
        onReplace={handleReplace}
        onToggleComment={handleToggleComment}
        onFormatDocument={handleFormatDocument}
        onSelectAll={handleSelectAll}
        workspace={workspace}
      />

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar
          sidebarVisible={sidebarVisible}
          onToggleSidebar={() => setSidebarVisible(v => !v)}
        />

        {sidebarVisible && (
          <>
            <div style={{ width: sidebarWidth }} className="flex-shrink-0 bg-[#181825] border-r border-[#313244] overflow-hidden">
              <Explorer
                fileTree={fileTree}
                workspace={workspace}
                onOpenFile={openFile}
                onCreateFile={createFile}
                onCreateFolder={createFolder}
                onDelete={deleteItem}
                onRename={renameItem}
                onCopy={copyItem}
                onPaste={pasteItem}
                onRefresh={refreshExplorer}
                onCollapseAll={collapseAll}
                onContextMenu={setContextMenu}
                onOpenFolder={handleOpenFolder}
                expandedPaths={expandedPaths}
                onToggleExpand={toggleExpand}
                onLoadChildren={loadDirectoryChildren}
              />
            </div>
            <div
              className="w-[4px] cursor-col-resize bg-transparent hover:bg-[#007acc] transition-colors flex-shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                sidebarResizing.current = true;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
              }}
            />
          </>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorTabs
            files={openFiles}
            activeFileId={activeFileId}
            onSelect={setActiveFile}
            onClose={closeFile}
            onCloseOthers={closeOtherFiles}
            onCloseAll={closeAllFiles}
          />

          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <CodeEditor
                file={activeFile}
                onChange={(content) => updateFileContent(activeFileId, content)}
                onSave={() => saveFile(activeFileId)}
                onEditorReady={handleEditorReady}
              />
            ) : (
              <WelcomeScreen onOpenFolder={handleOpenFolder} />
            )}
          </div>

          {bottomPanelVisible && (
            <>
              <div
                className="h-[4px] cursor-row-resize bg-transparent hover:bg-[#007acc] transition-colors flex-shrink-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  bottomResizing.current = true;
                  document.body.style.cursor = 'row-resize';
                  document.body.style.userSelect = 'none';
                }}
              />
              <div style={{ height: bottomPanelHeight }} className="flex-shrink-0 bg-[#1e1e2e] border-t border-[#313244] flex flex-col overflow-hidden">
                <div className="flex items-center border-b border-[#313244] bg-[#181825] px-2 gap-3">
                  {bottomTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveBottomTab(tab.id)}
                      className={`px-3 py-1.5 text-xs uppercase tracking-wide transition-colors rounded-t mx-0.5 ${
                        activeBottomTab === tab.id
                          ? "text-white border-b-2 border-[#007acc] bg-[#1e1e2e]"
                          : "text-[#888] hover:text-white hover:bg-[#313244]/50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button
                    onClick={() => setBottomPanelVisible(false)}
                    className="text-[#888] hover:text-white p-1 text-xs"
                    title="Close Panel"
                  >X</button>
                </div>
                <div className="flex-1 overflow-hidden select-text">
                  {activeBottomTab === "terminal" && (
                    <Terminal
                      sessions={terminalSessions}
                      activeSessionId={activeTerminalId}
                      onSetActiveSession={setActiveTerminalId}
                      onExecute={executeTerminalCommand}
                      onNewSession={createTerminalSession}
                      onClearSession={clearTerminal}
                      onCloseSession={closeTerminalSession}
                      workspace={workspace}
                    />
                  )}
                  {activeBottomTab === "problems" && <ProblemsPanel problems={problems} onOpenFile={openFile} />}
                  {activeBottomTab === "output" && <OutputPanel outputs={outputs} />}
                  {activeBottomTab === "debug" && <DebugConsole logs={debugLogs} />}
                  {activeBottomTab === "ports" && <PortsPanel ports={ports} />}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <StatusBar
        activeFile={activeFile}
        workspace={workspace}
        problems={problems}
        isDebugging={isDebugging}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={clearContextMenu}
        />
      )}
    </div>
  );
}

function WelcomeScreen({ onOpenFolder }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#1e1e2e] h-full w-full">
      <div className="flex flex-col items-center gap-6 max-w-md w-full px-8">
        <div className="text-6xl font-light text-[#007acc] font-display">CodeEditor</div>
        <p className="text-[#888] text-sm">Open a folder to start editing</p>
        <div className="flex flex-col items-center gap-3 pt-4 w-full">
          <button
            onClick={onOpenFolder}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#007acc] text-white rounded hover:bg-[#0098ff] transition-colors text-sm"
          >
            Open Folder
          </button>
          <div className="flex flex-col items-start gap-1 pt-4 text-xs text-[#666]">
            <div className="flex items-center gap-2">
              <span className="text-[#888]">Ctrl+S</span>
              <span>— Save</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#888]">Ctrl+B</span>
              <span>— Toggle Sidebar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#888]">Ctrl+`</span>
              <span>— Toggle Terminal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#888]">Ctrl+F5</span>
              <span>— Run File</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}