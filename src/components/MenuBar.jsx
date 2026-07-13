import React, { useState, useRef, useEffect } from "react";

const menus = [
  {
    label: "File",
    items: [
      { label: "New Text File", action: "newFile", shortcut: "Ctrl+N" },
      { label: "New Folder", action: "newFolder", shortcut: "" },
      { label: "Open Folder...", action: "openFolder", shortcut: "Ctrl+K Ctrl+O" },
      { type: "separator" },
      { label: "Save", action: "save", shortcut: "Ctrl+S" },
      { label: "Save All", action: "saveAll", shortcut: "Ctrl+K S" },
      { type: "separator" },
      { label: "Auto Save", action: "toggleAutoSave", toggle: true },
      { type: "separator" },
      { label: "Close Editor", action: "closeAll", shortcut: "Ctrl+F4" },
    ],
  },
  {
    label: "Edit",
    items: [
      { label: "Undo", action: "undo", shortcut: "Ctrl+Z" },
      { label: "Redo", action: "redo", shortcut: "Ctrl+Y" },
      { type: "separator" },
      { label: "Cut", action: "cut", shortcut: "Ctrl+X" },
      { label: "Copy", action: "copy", shortcut: "Ctrl+C" },
      { label: "Paste", action: "paste", shortcut: "Ctrl+V" },
      { type: "separator" },
      { label: "Find", action: "find", shortcut: "Ctrl+F" },
      { label: "Replace", action: "replace", shortcut: "Ctrl+H" },
      { type: "separator" },
      { label: "Toggle Line Comment", action: "toggleComment", shortcut: "Ctrl+/" },
      { label: "Format Document", action: "formatDocument", shortcut: "Shift+Alt+F" },
    ],
  },
  {
    label: "Selection",
    items: [
      { label: "Select All", action: "selectAll", shortcut: "Ctrl+A" },
      { type: "separator" },
      { label: "Copy Line Down", action: "copyLineDown", shortcut: "Shift+Alt+Down" },
    ],
  },
  {
    label: "View",
    items: [
      { label: "Explorer", action: "showExplorer", shortcut: "Ctrl+Shift+E" },
      { label: "Terminal", action: "showTerminal", shortcut: "Ctrl+`" },
      { type: "separator" },
      { label: "Problems", action: "showProblems", shortcut: "Ctrl+Shift+M" },
      { label: "Output", action: "showOutput", shortcut: "Ctrl+Shift+U" },
      { label: "Debug Console", action: "showDebug", shortcut: "Ctrl+Shift+Y" },
      { label: "Ports", action: "showPorts", shortcut: "" },
      { type: "separator" },
      { label: "Toggle Sidebar", action: "toggleSidebar", shortcut: "Ctrl+B" },
      { label: "Toggle Panel", action: "toggleBottomPanel", shortcut: "Ctrl+J" },
    ],
  },
  {
    label: "Run",
    items: [
      { label: "Start Debugging", action: "startDebug", shortcut: "F5" },
      { label: "Run Without Debugging", action: "runFile", shortcut: "Ctrl+F5" },
      { label: "Stop Debugging", action: "stopDebug", shortcut: "Shift+F5" },
    ],
  },
  {
    label: "Terminal",
    items: [
      { label: "New Terminal", action: "newTerminal", shortcut: "Ctrl+Shift+`" },
      { label: "Split Terminal", action: "splitTerminal", shortcut: "Ctrl+Shift+5" },
      { type: "separator" },
      { label: "Run Active File", action: "runFile", shortcut: "" },
      { label: "Clear Terminal", action: "clearTerminal", shortcut: "" },
    ],
  },
  {
    label: "Help",
    items: [
      { label: "About", action: "about" },
      { label: "Keyboard Shortcuts", action: "shortcuts", shortcut: "Ctrl+K Ctrl+R" },
    ],
  },
];

export default function MenuBar({
  onOpenFolder, onNewFile, onNewFolder, onSave, onSaveAll, onCloseAll,
  onToggleSidebar, onToggleBottomPanel, onToggleAutoSave, autoSave,
  onRunFile, onStartDebug, onStopDebug, isDebugging,
  onNewTerminal, onSplitTerminal, onClearTerminal, onShowPanel,
  onUndo, onRedo, onFind, onReplace, onToggleComment, onFormatDocument, onSelectAll,
  workspace,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAction = (action) => {
    setOpenMenu(null);
    const handlers = {
      openFolder: onOpenFolder,
      newFile: onNewFile,
      newFolder: onNewFolder,
      save: onSave,
      saveAll: onSaveAll,
      closeAll: onCloseAll,
      toggleSidebar: onToggleSidebar,
      toggleBottomPanel: onToggleBottomPanel,
      toggleAutoSave: onToggleAutoSave,
      runFile: onRunFile,
      startDebug: onStartDebug,
      stopDebug: onStopDebug,
      newTerminal: onNewTerminal,
      splitTerminal: onSplitTerminal,
      clearTerminal: onClearTerminal,
      undo: onUndo,
      redo: onRedo,
      find: onFind,
      replace: onReplace,
      toggleComment: onToggleComment,
      formatDocument: onFormatDocument,
      selectAll: onSelectAll,
      showExplorer: () => { onToggleSidebar(); },
      showTerminal: () => { onShowPanel?.("terminal"); },
      showProblems: () => { onShowPanel?.("problems"); },
      showOutput: () => { onShowPanel?.("output"); },
      showDebug: () => { onShowPanel?.("debug"); },
      showPorts: () => { onShowPanel?.("ports"); },
      about: () => alert("CodeEditor — A web-based code editor inspired by VS Code."),
      shortcuts: () => alert("Keyboard Shortcuts:\n\nCtrl+S — Save\nCtrl+B — Toggle Sidebar\nCtrl+` — Toggle Terminal\nCtrl+F5 — Run File\nF5 — Start Debugging\nCtrl+Shift+` — New Terminal\nCtrl+/ — Toggle Comment\nCtrl+F — Find\nCtrl+H — Replace"),
    };
    handlers[action]?.();
  };

  const titleParts = [];
  if (workspace) titleParts.push(workspace.name || workspace.path);
  titleParts.push("CodeEditor");

  return (
    <div ref={menuRef} className="h-[30px] bg-[#181825] border-b border-[#313244] flex items-center px-2 select-none flex-shrink-0">
      <div className="flex items-center gap-3">
        {menus.map((menu) => (
          <div key={menu.label} className="relative">
            <button
              className={`px-2 py-0.5 text-[12px] rounded-sm transition-colors ${
                openMenu === menu.label
                  ? "bg-[#313244] text-white"
                  : "text-[#ccc] hover:bg-[#313244]/60 hover:text-white"
              }`}
              onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
              onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
            >
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div className="absolute top-full left-0 mt-0.5 bg-[#252536] border border-[#414155] rounded shadow-xl py-1 min-w-[240px] z-50 max-h-[70vh] overflow-y-auto">
                {menu.items.map((item, i) =>
                  item.type === "separator" ? (
                    <div key={i} className="border-t border-[#414155] my-1 mx-2" />
                  ) : (
                    <button
                      key={i}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[12px] text-[#ccc] hover:bg-[#007acc] hover:text-white transition-colors"
                      onClick={() => handleAction(item.action)}
                    >
                      <span className="flex items-center gap-2">
                        {item.toggle && (
                          <span className="text-[10px] w-3">{autoSave ? "✓" : ""}</span>
                        )}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span className="text-[10px] text-[#888] ml-8 whitespace-nowrap">
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex-1 text-center text-[11px] text-[#888] truncate px-4">
        {titleParts.join(" — ")}
      </div>
    </div>
  );
}