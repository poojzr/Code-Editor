import React, { useState, useEffect } from "react";
import { X, Folder } from "lucide-react";
import { openWorkspace } from "../services/api";

const WORKSPACES = ["/opt/render/project/src/workspace"];

export default function FolderPicker({ onSelect, onClose }) {
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [availableFolders, setAvailableFolders] = useState([]);

  useEffect(() => {
    setAvailableFolders(WORKSPACES);
  }, []);

  const handleSelectFolder = async path => {
    setLoading(true);
    try {
      const info = await openWorkspace(path);
      setSelectedFolder(info);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleConfirm = () => {
    if (selectedFolder) {
      onSelect(selectedFolder.path);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#252536] border border-[#414155] rounded-lg w-[480px] max-w-[90vw] flex flex-col shadow-2xl"
        style={{ maxHeight: "75vh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#313244]">
          <h2 className="text-sm text-white font-medium">Open Workspace</h2>
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-[#666] text-sm">
              Loading...
            </div>
          ) : availableFolders.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#666] text-sm">
              No workspaces configured
            </div>
          ) : (
            availableFolders.map(path => (
              <button
                key={path}
                onClick={() => handleSelectFolder(path)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-[#ccc] hover:bg-[#313244] transition-colors text-left ${
                  selectedFolder && selectedFolder.path === path
                    ? "bg-[#313244]"
                    : ""
                }`}
              >
                <Folder
                  size={16}
                  className="text-[#007acc] flex-shrink-0"
                />
                <span className="truncate font-mono text-[12px]">
                  {path}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-[#313244]">
          <div className="text-xs text-[#888] truncate flex-1 mr-4 font-mono flex items-center gap-2">
            {selectedFolder && (
              <Folder size={12} className="text-[#007acc]" />
            )}
            {selectedFolder ? selectedFolder.path : "No workspace selected"}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-[#ccc] hover:bg-[#313244] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedFolder}
              className="px-4 py-1.5 text-xs bg-[#007acc] text-white rounded hover:bg-[#0098ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}