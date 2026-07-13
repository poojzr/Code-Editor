import React, { useState, useCallback } from "react";
import { FilePlus, FolderPlus, RefreshCw, ChevronsDownUp } from "lucide-react";
import FileTree from "./FileTree";

export default function Explorer({
  fileTree, workspace, onOpenFile, onCreateFile, onCreateFolder,
  onDelete, onRename, onCopy, onPaste, onRefresh, onCollapseAll,
  onContextMenu, onOpenFolder,
  expandedPaths, onToggleExpand, onLoadChildren,
}) {
  const [editingPath, setEditingPath] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newItemParent, setNewItemParent] = useState(null);
  const [newItemType, setNewItemType] = useState(null);
  const [newItemName, setNewItemName] = useState("");

  const handleTreeContextMenu = useCallback((e, node) => {
    const items = [];
    if (node.type === "directory") {
      items.push({ label: "New File...", action: () => { setNewItemParent(node.path); setNewItemType("file"); setNewItemName(""); } });
      items.push({ label: "New Folder...", action: () => { setNewItemParent(node.path); setNewItemType("folder"); setNewItemName(""); } });
      items.push({ type: "separator" });
    }
    items.push({ label: "Copy", action: () => onCopy(node.path) });
    if (node.type === "directory") {
      items.push({ label: "Paste", action: () => onPaste(node.path) });
    }
    items.push({ type: "separator" });
    items.push({
      label: "Rename",
      action: () => { setEditingPath(node.path); setEditValue(node.name); }
    });
    items.push({
      label: "Delete",
      action: () => {
        if (confirm(`Delete "${node.name}"?`)) onDelete(node.path);
      }
    });

    onContextMenu({ x: e.clientX, y: e.clientY, items });
  }, [onCopy, onPaste, onDelete, onContextMenu]);

  const handleEditSubmit = useCallback(() => {
    if (editValue.trim() && editingPath) {
      onRename(editingPath, editValue.trim());
    }
    setEditingPath(null);
    setEditValue("");
  }, [editValue, editingPath, onRename]);

  const handleEditCancel = useCallback(() => {
    setEditingPath(null);
    setEditValue("");
  }, []);

  const handleNewItemSubmit = useCallback(() => {
    if (!newItemName.trim()) { setNewItemParent(null); return; }
    if (newItemType === "file") {
      onCreateFile(newItemParent || workspace?.path || "", newItemName.trim());
    } else {
      onCreateFolder(newItemParent || workspace?.path || "", newItemName.trim());
    }
    setNewItemParent(null);
    setNewItemType(null);
    setNewItemName("");
  }, [newItemName, newItemType, newItemParent, onCreateFile, onCreateFolder, workspace]);

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-[12px] text-[#888] mb-3">No folder opened</p>
        <button
          onClick={onOpenFolder}
          className="px-4 py-1.5 bg-[#007acc] text-white text-[12px] rounded hover:bg-[#0098ff] transition-colors"
        >
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#313244]">
        <span className="text-[11px] uppercase tracking-wider text-[#888] font-semibold truncate">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            title="New File"
            onClick={() => { setNewItemParent(workspace?.path || ""); setNewItemType("file"); setNewItemName(""); }}
            className="p-1 text-[#888] hover:text-white rounded hover:bg-[#313244] transition-colors"
          >
            <FilePlus size={14} />
          </button>
          <button
            title="New Folder"
            onClick={() => { setNewItemParent(workspace?.path || ""); setNewItemType("folder"); setNewItemName(""); }}
            className="p-1 text-[#888] hover:text-white rounded hover:bg-[#313244] transition-colors"
          >
            <FolderPlus size={14} />
          </button>
          <button title="Refresh" onClick={onRefresh}
            className="p-1 text-[#888] hover:text-white rounded hover:bg-[#313244] transition-colors">
            <RefreshCw size={14} />
          </button>
          <button title="Collapse All" onClick={onCollapseAll}
            className="p-1 text-[#888] hover:text-white rounded hover:bg-[#313244] transition-colors">
            <ChevronsDownUp size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {newItemParent !== null && (
          <div className="px-3 py-1 flex items-center gap-1">
            <input
              autoFocus
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewItemSubmit();
                if (e.key === "Escape") { setNewItemParent(null); setNewItemType(null); }
              }}
              onBlur={() => { setNewItemParent(null); setNewItemType(null); }}
              placeholder={newItemType === "file" ? "File name" : "Folder name"}
              className="flex-1 bg-[#313244] text-[#ccc] text-[12px] px-2 py-1 border border-[#007acc] outline-none rounded-sm"
            />
          </div>
        )}
        <FileTree
          files={fileTree}
          onOpenFile={onOpenFile}
          onContextMenu={handleTreeContextMenu}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
          onLoadChildren={onLoadChildren}
          editingPath={editingPath}
          editValue={editValue}
          setEditValue={setEditValue}
          onEditSubmit={handleEditSubmit}
          onEditCancel={handleEditCancel}
        />
      </div>
    </div>
  );
}