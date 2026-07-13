import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronUp, Folder } from "lucide-react";
import * as api from "../services/api";

export default function FolderPicker({ onSelect, onClose }) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadDirectory = useCallback(async (path) => {
    setLoading(true);
    try {
      const result = await api.browseDirectories(path);
      setCurrentPath(result.path);
      setEntries(result.entries);
    } catch {
      try {
        const result = await api.browseDirectories();
        setCurrentPath(result.path);
        setEntries(result.entries);
      } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const goUp = () => {
    if (!currentPath) return;
    const parts = currentPath.replace(/\\/g, "/").split("/").filter(Boolean);
    parts.pop();
    const parent = parts.length > 0
      ? (currentPath.startsWith("/") ? "/" : "") + parts.join("/")
      : currentPath.replace(/\\/g, "/").split("/")[0] + "/";
    loadDirectory(parent || "/");
  };

  const handleSelect = () => {
    if (currentPath) {
      onSelect(currentPath);
      onClose();
    }
  };

  const folders = entries.filter(e => e.type === "directory");

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#252536] border border-[#414155] rounded-lg w-[640px] max-w-[90vw] flex flex-col shadow-2xl"
        style={{ maxHeight: "75vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
          <h2 className="text-sm text-white font-medium">Open Folder</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#313244]">
          <button
            onClick={goUp}
            className="p-1 text-[#888] hover:text-white hover:bg-[#313244] rounded transition-colors"
            title="Go Up"
          >
            <ChevronUp size={16} />
          </button>
          <div className="flex-1 text-xs text-[#ccc] truncate bg-[#1e1e2e] px-3 py-1.5 rounded font-mono">
            {currentPath || "—"}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#666] text-sm">
              Loading...
            </div>
          ) : folders.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#666] text-sm">
              No subfolders
            </div>
          ) : (
            folders.map(entry => (
              <div
                key={entry.path}
                className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer text-sm text-[#ccc] hover:bg-[#313244] transition-colors"
                onClick={() => loadDirectory(entry.path)}
                onDoubleClick={() => {
                  setCurrentPath(entry.path);
                  handleSelect();
                }}
              >
                <Folder size={16} className="text-[#007acc] flex-shrink-0" />
                <span className="truncate">{entry.name}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-[#313244]">
          <div className="text-xs text-[#888] truncate flex-1 mr-4 font-mono">
            {currentPath}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-[#ccc] hover:bg-[#313244] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!currentPath}
              className="px-4 py-1.5 text-xs bg-[#007acc] text-white rounded hover:bg-[#0098ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}